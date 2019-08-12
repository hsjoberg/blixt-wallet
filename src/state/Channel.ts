import { DeviceEventEmitter } from "react-native";
import { Thunk, thunk, Action, action } from "easy-peasy";
import { connectPeer, getNodeInfo } from "../lndmobile/index";
import { listChannels, openChannel, closeChannel, pendingChannels, channelBalance } from "../lndmobile/channel";
import { lnrpc } from "../../proto/proto";
import { StorageItem, getItemObject, setItemObject } from "../storage/app";

export interface IOpenChannelPayload {
  // <pubkey>@<ip>[:<port>]
  peer: string;
  amount: number;
}

export interface ICloseChannelPayload {
  fundingTx: string;
  outputIndex: number;
}

export interface ISetPendingChannelsPayload {
  pendingOpenChannels: lnrpc.PendingChannelsResponse.IPendingOpenChannel[];
  pendingClosingChannels: lnrpc.PendingChannelsResponse.IClosedChannel[];
  pendingForceClosingChannels: lnrpc.PendingChannelsResponse.IForceClosedChannel[];
}

export interface INodeAlias {
  [pubkey: string]: string;
}

export interface ISetAliasPayload {
  pubkey: string;
  alias: string;
}

export interface IChannelModel {
  initialize: Thunk<IChannelModel>;

  getChannels: Thunk<IChannelModel>;
  setChannels: Action<IChannelModel, lnrpc.IChannel[]>;
  setPendingChannels: Action<IChannelModel, lnrpc.PendingChannelsResponse>;
  setChannelUpdateSubscriptionStarted: Action<IChannelModel, boolean>;
  setAlias: Action<IChannelModel, ISetAliasPayload>;
  getBalance: Thunk<IChannelModel, undefined>;
  setBalance: Action<IChannelModel, number>;

  connectAndOpenChannel: Thunk<IChannelModel, IOpenChannelPayload>;
  closeChannel: Thunk<IChannelModel, ICloseChannelPayload>;

  channels: lnrpc.IChannel[];
  aliases: INodeAlias;
  pendingOpenChannels: lnrpc.PendingChannelsResponse.IPendingOpenChannel[];
  pendingClosingChannels: lnrpc.PendingChannelsResponse.IClosedChannel[];
  pendingForceClosingChannels: lnrpc.PendingChannelsResponse.IForceClosedChannel[];
  waitingCloseChannels: lnrpc.PendingChannelsResponse.IWaitingCloseChannel[];
  channelUpdateSubscriptionStarted: boolean;
  balance: number;
}

export const channel: IChannelModel = {
  initialize: thunk(async (actions, _, { getState }) => {
    // Use cached balance before retrieving from lnd:
    actions.setBalance(await getItemObject(StorageItem.lightningBalance));

    await Promise.all([
      actions.getChannels(undefined),
      actions.getBalance(undefined),
    ]);

    if (getState().channelUpdateSubscriptionStarted) {
      console.log("WARNING: Channel.channelUpdateSubscriptionStarted() called when subsription already started");
      return;
    }
    else {
      console.log("Starting channel update subscription");
      DeviceEventEmitter.addListener("CloseChannel", async (e: any) => {
        console.log("Event CloseChannel");
        console.log(e);
        await actions.getChannels(undefined);
      });
      actions.setChannelUpdateSubscriptionStarted(true);
    }
  }),

  getChannels: thunk(async (actions, _, { getState }) => {
    const channels = await listChannels();
    actions.setChannels(channels.channels);

    const responsePendingChannels = await pendingChannels();
    actions.setPendingChannels(responsePendingChannels);

    const { aliases } = getState();
    const setupAlias = async (chan: lnrpc.IChannel | lnrpc.PendingChannelsResponse.IPendingChannel) => {
      const pubkey = (chan as lnrpc.IChannel).remotePubkey !== undefined
        ? (chan as lnrpc.IChannel).remotePubkey
        : (chan as lnrpc.PendingChannelsResponse.IPendingChannel).remoteNodePub;

      if (pubkey && typeof pubkey === "string" && !(pubkey! in aliases)) {
        const nodeInfo = await getNodeInfo(pubkey);
        if (nodeInfo.node && nodeInfo.node.alias) {
          actions.setAlias({ pubkey, alias: nodeInfo.node.alias });
        }
      }
    };

    channels.channels.map(async (chan) => setupAlias(chan));
    responsePendingChannels.pendingOpenChannels.map(async (chan) => chan.channel && setupAlias(chan.channel));
    responsePendingChannels.pendingClosingChannels.map(async (chan) => chan.channel && setupAlias(chan.channel));
    responsePendingChannels.pendingForceClosingChannels.map(async (chan) => chan.channel && setupAlias(chan.channel));
    responsePendingChannels.waitingCloseChannels.map(async (chan) => chan.channel && setupAlias(chan.channel));
  }),

  connectAndOpenChannel: thunk(async (_, { peer, amount }) => {
    const [pubkey, host] = peer.split("@");
    try {
      await connectPeer(pubkey, host);
    }
    catch (e) {
      if (!e.message.includes("already connected to peer")) {
        throw e;
      }
    }

    const result = await openChannel(pubkey, amount);
    console.log(result);
    return result;
  }),

  closeChannel: thunk(async (_, { fundingTx, outputIndex }) => {
    const result = await closeChannel(fundingTx, outputIndex);
    console.log(result);
    return result;
  }),

  getBalance: thunk(async (actions) => {
    const response = await channelBalance(); // response.balance is not Long for some reason
    actions.setBalance(response.balance);
    await setItemObject(StorageItem.lightningBalance, response.balance.toString());
  }),

  setPendingChannels: action((state, payload) => {
    state.pendingOpenChannels = payload.pendingOpenChannels;
    state.pendingClosingChannels = payload.pendingClosingChannels;
    state.pendingForceClosingChannels = payload.pendingForceClosingChannels;
    state.waitingCloseChannels = payload.waitingCloseChannels;
  }),

  setChannels: action((state, payload) => { state.channels = payload; }),
  setChannelUpdateSubscriptionStarted: action((state, payload) => { state.channelUpdateSubscriptionStarted = payload; }),
  setAlias: action((state, payload) => { state.aliases[payload.pubkey] = payload.alias; }),
  setBalance: action((state, payload) => { state.balance = payload; }),

  channels: [],
  aliases: {},
  pendingOpenChannels: [],
  pendingClosingChannels: [],
  pendingForceClosingChannels: [],
  waitingCloseChannels: [],
  channelUpdateSubscriptionStarted: false,
  balance: 0,
};

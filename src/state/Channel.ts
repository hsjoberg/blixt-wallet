import { Thunk, thunk, Action, action } from "easy-peasy";
import { listChannels, openChannel, closeChannel, pendingChannels } from "../lndmobile/channel";
import { connectPeer, getNodeInfo } from "../lndmobile";
import { lnrpc } from "../../proto/proto";
import { DeviceEventEmitter } from "react-native";

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

  connectAndOpenChannel: Thunk<IChannelModel, IOpenChannelPayload>;
  closeChannel: Thunk<IChannelModel, ICloseChannelPayload>;

  channels: lnrpc.IChannel[];
  aliases: INodeAlias;
  pendingOpenChannels: lnrpc.PendingChannelsResponse.IPendingOpenChannel[];
  pendingClosingChannels: lnrpc.PendingChannelsResponse.IClosedChannel[];
  pendingForceClosingChannels: lnrpc.PendingChannelsResponse.IForceClosedChannel[];
  waitingCloseChannels: lnrpc.PendingChannelsResponse.IWaitingCloseChannel[];

  channelUpdateSubscriptionStarted: boolean;
}

export const channel: IChannelModel = {
  initialize: thunk(async (actions, _, { getState }) => {
    await actions.getChannels(undefined);

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

  setChannels: action((state, payload) => {
    state.channels = payload;
  }),

  setPendingChannels: action((state, payload) => {
    state.pendingOpenChannels = payload.pendingOpenChannels;
    state.pendingClosingChannels = payload.pendingClosingChannels;
    state.pendingForceClosingChannels = payload.pendingForceClosingChannels;
    state.waitingCloseChannels = payload.waitingCloseChannels;
  }),

  setChannelUpdateSubscriptionStarted: action((state, payload) => {
    state.channelUpdateSubscriptionStarted = payload;
  }),

  setAlias: action((state, payload) => {
    state.aliases[payload.pubkey] = payload.alias;
  }),

  connectAndOpenChannel: thunk(async (_, { peer, amount }) => {
    const [pubkey, host] = peer.split("@");
    await connectPeer(pubkey, host);

    const result = await openChannel(pubkey, amount);
    console.log(result);
    return result;
  }),

  closeChannel: thunk(async (_, { fundingTx, outputIndex }) => {
    const result = await closeChannel(fundingTx, outputIndex);
    console.log(result);
    return result;
  }),

  channels: [],
  aliases: {},
  pendingOpenChannels: [],
  pendingClosingChannels: [],
  pendingForceClosingChannels: [],
  waitingCloseChannels: [],
  channelUpdateSubscriptionStarted: false,
};

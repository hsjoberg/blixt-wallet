import { DeviceEventEmitter } from "react-native";
import { Thunk, thunk, Action, action, Computed, computed } from "easy-peasy";
import Long from "long";
import bitcoin from "bitcoin-units";

import { connectPeer, getNodeInfo } from "../lndmobile/index";
import { listChannels, openChannel, closeChannel, pendingChannels, channelBalance } from "../lndmobile/channel";
import { lnrpc } from "../../proto/proto";
import { StorageItem, getItemObject, setItemObject } from "../storage/app";
import { IStoreInjections } from "./store";
import { IStoreModel } from "../state";
import { IChannelEvent, getChannelEvents, createChannelEvent } from "../storage/database/channel-events";

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
  initialize: Thunk<IChannelModel, void, IStoreInjections, IStoreModel>;

  getChannels: Thunk<IChannelModel>;
  getChannelEvents: Thunk<IChannelModel, void, any, IStoreModel>;
  getBalance: Thunk<IChannelModel, undefined>;
  connectAndOpenChannel: Thunk<IChannelModel, IOpenChannelPayload>;
  closeChannel: Thunk<IChannelModel, ICloseChannelPayload>;

  setChannels: Action<IChannelModel, lnrpc.IChannel[]>;
  setChannelEvents: Action<IChannelModel, IChannelEvent[]>;
  addChannelEvent: Action<IChannelModel, IChannelEvent>;
  setPendingChannels: Action<IChannelModel, lnrpc.PendingChannelsResponse>;
  setChannelUpdateSubscriptionStarted: Action<IChannelModel, boolean>;
  setAlias: Action<IChannelModel, ISetAliasPayload>;
  setBalance: Action<IChannelModel, Long>;

  channels: lnrpc.IChannel[];
  aliases: INodeAlias;
  pendingOpenChannels: lnrpc.PendingChannelsResponse.IPendingOpenChannel[];
  pendingClosingChannels: lnrpc.PendingChannelsResponse.IClosedChannel[];
  pendingForceClosingChannels: lnrpc.PendingChannelsResponse.IForceClosedChannel[];
  waitingCloseChannels: lnrpc.PendingChannelsResponse.IWaitingCloseChannel[];
  channelUpdateSubscriptionStarted: boolean;
  balance: Long;
  channelEvents: IChannelEvent[];
}

export const channel: IChannelModel = {
  initialize: thunk(async (actions, _, { getState, getStoreState, injections }) => {
    // Use cached balance before retrieving from lnd:
    actions.setBalance(Long.fromString(await getItemObject(StorageItem.lightningBalance)));

    await Promise.all([
      actions.getChannels(),
      actions.getChannelEvents(),
      actions.getBalance(),
    ]);

    if (getState().channelUpdateSubscriptionStarted) {
      console.log("Channel.initialize() called when subscription already started");
      return;
    }
    else {
      console.log("Starting channel update subscription");
      await injections.lndMobile.channel.subscribeChannelEvents();
      DeviceEventEmitter.addListener("SubscribeChannelEvents", async (e: any) => {
        const db = getStoreState().db;
        if (!db) {
          throw new Error("SubscribeChannelEvents: db not ready");
        }

        const decodeChannelEvent = injections.lndMobile.channel.decodeChannelEvent;
        console.log("Event SubscribeChannelEvents", e);
        const channelEvent = decodeChannelEvent(e.data);
        console.log(channelEvent, channelEvent.type);

        if (channelEvent.openChannel) {
          const txId = channelEvent.openChannel.channelPoint!.split(":")[0];
          const chanEvent: IChannelEvent = {
            txId,
            type: "OPEN",
          };
          const insertId = await createChannelEvent(db, chanEvent);
          actions.addChannelEvent({ id: insertId, ...chanEvent });
        }
        else if (channelEvent.closedChannel) {
          const txId = channelEvent.closedChannel.closingTxHash;
          const chanEvent: IChannelEvent = {
            txId: txId!,
            type: "CLOSE",
          };
          const insertId = await createChannelEvent(db, chanEvent);
          actions.addChannelEvent({ id: insertId, ...chanEvent });
        }

        await Promise.all([
          actions.getChannels(undefined),
          actions.getBalance(undefined),
        ]);
      });
      DeviceEventEmitter.addListener("CloseChannel", async (e: any) => {
        console.log("Event CloseChannel");
        console.log(e);
        await actions.getChannels(undefined);
      });
      actions.setChannelUpdateSubscriptionStarted(true);
    }
    return true;
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

  getChannelEvents: thunk(async (actions, _, { getStoreState }) => {
    const db = getStoreState().db;
    if (!db) {
      throw new Error("getChannelEvents(): db not ready");
    }
    const channelEvents = await getChannelEvents(db);
    actions.setChannelEvents(channelEvents);
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

    const result = await openChannel(pubkey, amount, true);
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
    actions.setBalance(
      response.balance.toNumber
        ? response.balance
        : Long.fromNumber(0)
    );
    await setItemObject(StorageItem.lightningBalance, response.balance.toString());
  }),

  setPendingChannels: action((state, payload) => {
    state.pendingOpenChannels = payload.pendingOpenChannels;
    state.pendingClosingChannels = payload.pendingClosingChannels;
    state.pendingForceClosingChannels = payload.pendingForceClosingChannels;
    state.waitingCloseChannels = payload.waitingCloseChannels;
  }),

  setChannels: action((state, payload) => { state.channels = payload; }),
  setChannelEvents: action((state, payload) => { state.channelEvents = payload; }),
  addChannelEvent: action((state, payload) => { state.channelEvents.push(payload); }),
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
  balance: Long.fromNumber(0),
  channelEvents: [],
};

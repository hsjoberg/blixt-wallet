import { NativeModules } from "react-native";
import { Thunk, thunk, Action, action, Computed, computed } from "easy-peasy";
import Long from "long";
import * as base64 from "base64-js";

import { lnrpc } from "../../proto/proto";
import { StorageItem, getItemObject, setItemObject } from "../storage/app";
import { IStoreInjections } from "./store";
import { IStoreModel } from "../state";
import { IChannelEvent, getChannelEvents, createChannelEvent } from "../storage/database/channel-events";
import { bytesToHexString, timeout, toast } from "../utils";
import { LndMobileEventEmitter } from "../utils/event-listener";
import { checkLndStreamErrorResponse } from "../utils/lndmobile";

import logger from "./../utils/log";
const log = logger("Channel");

export interface IOpenChannelPayload {
  // <pubkey>@<ip>[:<port>]
  peer: string;
  amount: number;
}

export interface ICloseChannelPayload {
  fundingTx: string;
  outputIndex: number;
  force: boolean;
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
  setupCachedBalance: Thunk<IChannelModel>;
  initialize: Thunk<IChannelModel, undefined, IStoreInjections>;

  setupChannelUpdateSubscriptions: Thunk<IChannelModel, void, IStoreInjections, IStoreModel>;
  getChannels: Thunk<IChannelModel, void, IStoreInjections>;
  getChannelEvents: Thunk<IChannelModel, void, any, IStoreModel>;
  getBalance: Thunk<IChannelModel, undefined, IStoreInjections>;
  connectAndOpenChannel: Thunk<IChannelModel, IOpenChannelPayload, IStoreInjections, IStoreModel>;
  closeChannel: Thunk<IChannelModel, ICloseChannelPayload, IStoreInjections, IStoreModel>;
  abandonChannel: Thunk<IChannelModel, ICloseChannelPayload>;
  exportChannelsBackup: Thunk<IChannelModel, void, IStoreInjections>;

  setChannels: Action<IChannelModel, lnrpc.IChannel[]>;
  setChannelEvents: Action<IChannelModel, IChannelEvent[]>;
  addChannelEvent: Action<IChannelModel, IChannelEvent>;
  setPendingChannels: Action<IChannelModel, lnrpc.PendingChannelsResponse>;
  setChannelUpdateSubscriptionStarted: Action<IChannelModel, boolean>;
  setAlias: Action<IChannelModel, ISetAliasPayload>;
  setBalance: Action<IChannelModel, Long>;
  setPendingOpenBalance: Action<IChannelModel, Long>;

  channels: lnrpc.IChannel[];
  aliases: INodeAlias;
  pendingOpenChannels: lnrpc.PendingChannelsResponse.IPendingOpenChannel[];
  pendingClosingChannels: lnrpc.PendingChannelsResponse.IClosedChannel[];
  pendingForceClosingChannels: lnrpc.PendingChannelsResponse.IForceClosedChannel[];
  waitingCloseChannels: lnrpc.PendingChannelsResponse.IWaitingCloseChannel[];
  channelUpdateSubscriptionStarted: boolean;
  balance: Long;
  pendingOpenBalance: Long;
  remoteBalance: Computed<IChannelModel, Long>;
  channelEvents: IChannelEvent[];
}

export const channel: IChannelModel = {
  setupCachedBalance: thunk(async (actions) => {
    log.d("setupCachedBalance()");
    // Use cached balance before retrieving from lnd:
    actions.setBalance(Long.fromString(await getItemObject(StorageItem.lightningBalance) ?? "0"));
    log.d("setupCachedBalance() done");
  }),

  initialize: thunk(async (actions, _, { getState, injections }) => {
    if (getState().channelUpdateSubscriptionStarted) {
      log.d("Channel.initialize() called when subscription already started");
      return;
    }
    await actions.setupChannelUpdateSubscriptions();

    await Promise.all([
      actions.getChannels(),
      actions.getChannelEvents(),
      actions.getBalance(),
    ]);

    // Temporary fix as the Blixt IP has changed:
    const channels = getState().channels;
    for (const channel of channels) {
      if (channel.remotePubkey === "0230a5bca558e6741460c13dd34e636da28e52afd91cf93db87ed1b0392a7466eb") {
        let tries = 25;
        while (tries-- !== 0) {
          log.i("Found channel with Blixt node, trying to connect via the new IP address");
          try {
            await injections.lndMobile.index.connectPeer(
              "0230a5bca558e6741460c13dd34e636da28e52afd91cf93db87ed1b0392a7466eb",
              "176.9.17.121:9735"
            );
            break;
          } catch (error) {
            if (!error.message.includes("already connected to peer")) {
              log.i("Failed to connect to Blixt node", [error]);
              log.i("Trying again...");
              await timeout(5000);
            } else {
              break;
            }
          }
        }
        break;
      }
    }

    return true;
  }),

  setupChannelUpdateSubscriptions: thunk(async (actions, _2, { getStoreState, getStoreActions, injections }) => {
    log.i("Starting channel update subscription");
    LndMobileEventEmitter.addListener("SubscribeChannelEvents", async (e: any) => {
      try {
        const error = checkLndStreamErrorResponse("SubscribeChannelEvents", e);
        if (error === "EOF") {
          return;
        } else if (error) {
          log.d("Got error from SubscribeChannelEvents", [error]);
          throw error;
        }

        const db = getStoreState().db;
        if (!db) {
          throw new Error("SubscribeChannelEvents: db not ready");
        }
        const pushNotificationsEnabled = getStoreState().settings.pushNotificationsEnabled;

        const decodeChannelEvent = injections.lndMobile.channel.decodeChannelEvent;
        log.v("Event SubscribeChannelEvents", [e]);
        const channelEvent = decodeChannelEvent(e.data);
        log.v("channelEvent" , [channelEvent, channelEvent.type]);

        if (getStoreState().onboardingState === "SEND_ONCHAIN") {
          log.i("Changing onboarding state to DO_BACKUP");
          getStoreActions().changeOnboardingState("DO_BACKUP");
        }

        if (channelEvent.openChannel) {
          const txId = channelEvent.openChannel.channelPoint!.split(":")[0];
          const chanEvent: IChannelEvent = {
            txId,
            type: "OPEN",
          };
          const insertId = await createChannelEvent(db, chanEvent);
          actions.addChannelEvent({ id: insertId, ...chanEvent });

          if (pushNotificationsEnabled) {
            try {
              let message = "Opened payment channel";
              const node = await injections.lndMobile.index.getNodeInfo(channelEvent.openChannel.remotePubkey!);
              if (node && node.node) {
                message += ` with ${node.node.alias}`;
              }
              getStoreActions().notificationManager.localNotification({ message, importance: "high" });
            } catch (e) {
              log.e("Push notification failed: ", [e.message]);
            }
          }
        }
        else if (channelEvent.closedChannel) {
          const txId = channelEvent.closedChannel.closingTxHash;
          const chanEvent: IChannelEvent = {
            txId: txId!,
            type: "CLOSE",
          };
          const insertId = await createChannelEvent(db, chanEvent);
          actions.addChannelEvent({ id: insertId, ...chanEvent });

          if (pushNotificationsEnabled) {
            try {
              let message = "Payment channel";
              const node = await injections.lndMobile.index.getNodeInfo(channelEvent.closedChannel.remotePubkey!);
              if (node && node.node) {
                message += ` with ${node.node.alias}`;
              }
              message += " closed";
              getStoreActions().notificationManager.localNotification({ message, importance: "high" });
            } catch (e) {
              log.e("Push notification failed: ", [e.message]);
            }
          }
        }
        else if (channelEvent.pendingOpenChannel) {
          if (pushNotificationsEnabled) {
            const pendingChannels = await injections.lndMobile.channel.pendingChannels();
            let alias;
            for (const pendingOpen of pendingChannels.pendingOpenChannels) {
              if (pendingOpen.channel) {
                const txId = [...channelEvent.pendingOpenChannel.txid!].reverse();
                if (pendingOpen.channel.channelPoint!.split(":")[0] === bytesToHexString(txId)) {
                  const r = await injections.lndMobile.index.getNodeInfo(pendingOpen.channel.remoteNodePub!);
                  alias = r.node!.alias;
                }
              }
            }

            try {
              let message = "Opening Payment channel";
              if (alias) {
                message += ` with ${alias}`;
              }
              getStoreActions().notificationManager.localNotification({ message, importance: "high" });
            } catch (e) {
              log.e("Push notification failed: ", [e.message]);
            }
          }
        }

        // Silently ignore these errors because they can erroneously be triggered
        // on an lnd shutdown as channel inactive event is fired just before the stream closure.
        try {
          await Promise.all([
            actions.getChannels(),
            actions.getBalance(),
          ]);
        } catch (e) {
          log.i("", [e]);
        }
      } catch (error) {
        toast(error.message, undefined, "danger");
      }
    });

    LndMobileEventEmitter.addListener("CloseChannel", async (e: any) => {
      const error = checkLndStreamErrorResponse("CloseChannel", e);
      if (error === "EOF") {
        return;
      } else if (error) {
        log.d("Got error from CloseChannel", [error]);
        return;
      }

      log.i("Event CloseChannel", [e]);
      await actions.getChannels();
    });
    await injections.lndMobile.channel.subscribeChannelEvents();
    actions.setChannelUpdateSubscriptionStarted(true);
  }),

  getChannels: thunk(async (actions, _, { getState, injections }) => {
    const { getNodeInfo } = injections.lndMobile.index;
    const { listChannels, pendingChannels } = injections.lndMobile.channel;

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

  connectAndOpenChannel: thunk(async (_, { peer, amount }, { injections, getStoreActions }) => {
    const { connectPeer } = injections.lndMobile.index;
    const { openChannel } = injections.lndMobile.channel;
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
    getStoreActions().onChain.addToTransactionNotificationBlacklist(bytesToHexString(result.fundingTxidBytes.reverse()))
    log.d("openChannel", [result]);
    return result;
  }),

  closeChannel: thunk(async (_, { fundingTx, outputIndex, force }, { injections, getStoreActions }) => {
    const closeChannel = injections.lndMobile.channel.closeChannel;
    const result = await closeChannel(fundingTx, outputIndex, force);
    getStoreActions().onChain.addToTransactionNotificationBlacklist(fundingTx);
    log.d("closeChannel", [result]);
    return result;
  }),

  abandonChannel: thunk(async (_, { fundingTx, outputIndex }, { injections }) => {
    const abandonChannel = injections.lndMobile.channel.abandonChannel;
    const result = await abandonChannel(fundingTx, outputIndex);
    log.d("abandonChannel", [result]);
    return result;
  }),

  exportChannelsBackup: thunk(async (_, _2, { injections }) => {
    const response = await injections.lndMobile.channel.exportAllChannelBackups();
    if (response.multiChanBackup && response.multiChanBackup.multiChanBackup) {
      const exportResponse = await NativeModules.LndMobileTools.saveChannelsBackup(
        base64.fromByteArray(response.multiChanBackup.multiChanBackup)
      );
      return exportResponse;
    }
    else {
      throw new Error("Export failed");
    }
  }),

  getBalance: thunk(async (actions, _, { injections }) => {
    const { channelBalance } = injections.lndMobile.channel;
    const response = await channelBalance(); // response.balance is not Long for some reason
    actions.setBalance(
      response.balance.toNumber
        ? response.balance
        : Long.fromNumber(0)
    );
    actions.setPendingOpenBalance(
      response.pendingOpenBalance.toNumber
        ? response.pendingOpenBalance
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
  setPendingOpenBalance: action((state, payload) => { state.pendingOpenBalance = payload; }),

  channels: [],
  aliases: {},
  pendingOpenChannels: [],
  pendingClosingChannels: [],
  pendingForceClosingChannels: [],
  waitingCloseChannels: [],
  channelUpdateSubscriptionStarted: false,
  balance: Long.fromNumber(0),
  remoteBalance: computed((store) => {
    return store.channels
      .filter((channel) => channel.active)
      .reduce((prev, currChannel) => prev.add(currChannel.remoteBalance || Long.fromValue(0)), Long.fromValue(0));
  }),
  pendingOpenBalance: Long.fromNumber(0),
  channelEvents: [],
};

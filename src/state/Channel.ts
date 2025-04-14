import { NativeModules } from "react-native";
import { Thunk, thunk, Action, action, Computed, computed } from "easy-peasy";
import * as base64 from "base64-js";

import { StorageItem, getItemObject, setItemObject } from "../storage/app";
import { IStoreInjections } from "./store";
import { IStoreModel } from "./index";
import {
  IChannelEvent,
  getChannelEvents,
  createChannelEvent,
} from "../storage/database/channel-events";
import { bytesToHexString, toast } from "../utils";
import { LndMobileEventEmitter } from "../utils/event-listener";
import { checkLndStreamErrorResponse } from "../utils/lndmobile";

import {
  abandonChannel,
  channelBalance,
  closeChannel,
  connectPeer,
  exportAllChannelBackups,
  getNodeInfo,
  listChannels,
  openChannelSync,
  pendingChannels,
  subscribeChannelEvents,
} from "react-native-turbo-lnd";
import {
  Channel,
  CommitmentType,
  PendingChannelsResponse,
  PendingChannelsResponse_ClosedChannel,
  PendingChannelsResponse_ForceClosedChannel,
  PendingChannelsResponse_PendingChannel,
  PendingChannelsResponse_PendingOpenChannel,
  PendingChannelsResponse_WaitingCloseChannel,
} from "react-native-turbo-lnd/protos/lightning_pb";

import logger from "./../utils/log";
const log = logger("Channel");

export interface IOpenChannelPayload {
  // <pubkey>@<ip>[:<port>]
  peer: string;
  amount: number;
  feeRateSat?: number;
  type?: CommitmentType;
}

export interface IOpenChannelPayloadAll {
  // <pubkey>@<ip>[:<port>]
  peer: string;
  feeRateSat?: number;
  type?: CommitmentType;
}

export interface ICloseChannelPayload {
  fundingTx: string;
  outputIndex: number;
  force: boolean;
  deliveryAddress?: string;
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
  connectAndOpenChannelAll: Thunk<
    IChannelModel,
    IOpenChannelPayloadAll,
    IStoreInjections,
    IStoreModel
  >;
  closeChannel: Thunk<IChannelModel, ICloseChannelPayload, IStoreInjections, IStoreModel>;
  abandonChannel: Thunk<IChannelModel, ICloseChannelPayload>;
  exportChannelsBackup: Thunk<IChannelModel, void, IStoreInjections>;
  exportChannelBackupFile: Thunk<IChannelModel, void, IStoreInjections>;

  setChannels: Action<IChannelModel, Channel[]>;
  setChannelEvents: Action<IChannelModel, IChannelEvent[]>;
  addChannelEvent: Action<IChannelModel, IChannelEvent>;
  setPendingChannels: Action<IChannelModel, PendingChannelsResponse>;
  setChannelUpdateSubscriptionStarted: Action<IChannelModel, boolean>;
  setAlias: Action<IChannelModel, ISetAliasPayload>;
  setBalance: Action<IChannelModel, bigint>;
  setPendingOpenBalance: Action<IChannelModel, bigint>;

  channels: Channel[];
  aliases: INodeAlias;
  pendingOpenChannels: PendingChannelsResponse_PendingOpenChannel[];
  pendingClosingChannels: PendingChannelsResponse_ClosedChannel[];
  pendingForceClosingChannels: PendingChannelsResponse_ForceClosedChannel[];
  waitingCloseChannels: PendingChannelsResponse_WaitingCloseChannel[];
  channelUpdateSubscriptionStarted: boolean;
  balance: bigint;
  pendingOpenBalance: bigint;
  remoteBalance: Computed<IChannelModel, bigint>;
  channelEvents: IChannelEvent[];
}

export const channel: IChannelModel = {
  setupCachedBalance: thunk(async (actions) => {
    log.d("setupCachedBalance()");
    // Use cached balance before retrieving from lnd:
    actions.setBalance(BigInt((await getItemObject(StorageItem.lightningBalance)) ?? "0"));
    log.d("setupCachedBalance() done");
  }),

  initialize: thunk(async (actions, _, { getState }) => {
    if (getState().channelUpdateSubscriptionStarted) {
      log.d("Channel.initialize() called when subscription already started");
      return;
    }
    await actions.setupChannelUpdateSubscriptions();

    await Promise.all([actions.getChannels(), actions.getChannelEvents(), actions.getBalance()]);

    return true;
  }),

  setupChannelUpdateSubscriptions: thunk(
    async (actions, _2, { getStoreState, getStoreActions }) => {
      log.i("Starting channel update subscription");
      const db = getStoreState().db;
      if (!db) {
        throw new Error("SubscribeChannelEvents: db not ready");
      }

      subscribeChannelEvents(
        {},
        async (channelEvent) => {
          try {
            log.v("channelEvent", [channelEvent, channelEvent.type]);
            const pushNotificationsEnabled = getStoreState().settings.pushNotificationsEnabled;

            if (getStoreState().onboardingState === "SEND_ONCHAIN") {
              log.i("Changing onboarding state to DO_BACKUP");
              getStoreActions().changeOnboardingState("DO_BACKUP");
            }

            if (channelEvent.channel.case === "openChannel") {
              const txId = channelEvent.channel.value.channelPoint.split(":")[0];
              const chanEvent: IChannelEvent = {
                txId,
                type: "OPEN",
              };
              const insertId = await createChannelEvent(db, chanEvent);
              actions.addChannelEvent({ id: insertId, ...chanEvent });

              if (pushNotificationsEnabled) {
                try {
                  let message = "Opened payment channel";
                  try {
                    const nodeInfo = await getNodeInfo({
                      pubKey: channelEvent.channel.value.remotePubkey,
                    });
                    if (nodeInfo.node) {
                      message += ` with ${nodeInfo.node?.alias}`;
                    }
                  } catch (error) {
                    message += ` with ${channelEvent.channel.value.remotePubkey}`;
                  }
                  getStoreActions().notificationManager.localNotification({
                    message,
                  });
                } catch (e: any) {
                  log.e("Push notification failed: ", [e.message]);
                }
              }
            } else if (channelEvent.channel.case === "closedChannel") {
              const txId = channelEvent.channel.value.closingTxHash;
              const chanEvent: IChannelEvent = {
                txId,
                type: "CLOSE",
              };
              const insertId = await createChannelEvent(db, chanEvent);
              actions.addChannelEvent({ id: insertId, ...chanEvent });

              if (pushNotificationsEnabled) {
                try {
                  let message = "Payment channel";
                  const nodeInfo = await getNodeInfo({
                    pubKey: channelEvent.channel.value.remotePubkey,
                  });
                  if (nodeInfo.node) {
                    message += ` with ${nodeInfo.node?.alias}`;
                  }
                  message += " closed";
                  getStoreActions().notificationManager.localNotification({
                    message,
                  });
                } catch (e: any) {
                  log.e("Push notification failed: ", [e.message]);
                }
              }
            } else if (channelEvent.channel.case === "pendingOpenChannel") {
              // TURBOTODO: Perhaps could use data from channelEvent.channel.value instead?

              if (pushNotificationsEnabled) {
                const pendingChans = await pendingChannels({});
                let alias;
                for (const pendingOpen of pendingChans.pendingOpenChannels) {
                  if (pendingOpen.channel) {
                    const txId = [...channelEvent.channel.value.txid].reverse();
                    if (
                      pendingOpen.channel.channelPoint!.split(":")[0] === bytesToHexString(txId)
                    ) {
                      try {
                        const nodeInfo = await getNodeInfo({
                          pubKey: pendingOpen.channel.remoteNodePub,
                        });
                        if (nodeInfo.node) {
                          alias = nodeInfo.node?.alias;
                        }
                      } catch (e) {
                        log.e("getNodeInfo failed", [e]);
                      }
                    }
                  }
                }

                try {
                  let message = "Opening Payment channel";
                  if (alias) {
                    message += ` with ${alias}`;
                  }
                  getStoreActions().notificationManager.localNotification({
                    message,
                  });
                } catch (e: any) {
                  log.e("Push notification failed: ", [e.message]);
                }
              }
            }

            // TURBOTODO: look into if this is still needed:
            // Silently ignore these errors because they can erroneously be triggered
            // on an lnd shutdown as channel inactive event is fired just before the stream closure.
            try {
              await Promise.all([actions.getChannels(), actions.getBalance()]);
            } catch (e) {
              log.i("", [e]);
            }
          } catch (error: any) {
            toast(error.message, undefined, "danger");
          }
        },
        (error) => {
          toast("subscribeChannelEvents: " + error, 7000, "danger");
        },
      );

      // TURBOTODO: how do we replace this?
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
      actions.setChannelUpdateSubscriptionStarted(true);
    },
  ),

  getChannels: thunk(async (actions, _, { getState }) => {
    const channels = await listChannels({});
    actions.setChannels(channels.channels);

    const responsePendingChannels = await pendingChannels({});
    actions.setPendingChannels(responsePendingChannels);

    const aliases = getState().aliases;
    const setupAlias = async (chan: Channel | PendingChannelsResponse_PendingChannel) => {
      const pubkey =
        (chan as Channel).remotePubkey ??
        (chan as PendingChannelsResponse_PendingChannel).remoteNodePub;

      if (pubkey && typeof pubkey === "string" && !(pubkey! in aliases)) {
        try {
          const nodeInfo = await getNodeInfo({
            pubKey: pubkey,
          });
          if (nodeInfo.node && nodeInfo.node.alias) {
            actions.setAlias({ pubkey, alias: nodeInfo.node.alias });
          }
        } catch (error) {
          log.w("getNodeInfo failed", [error]);
        }
      }
    };

    channels.channels.map(async (chan) => setupAlias(chan));
    responsePendingChannels.pendingOpenChannels.map(
      async (chan) => chan.channel && setupAlias(chan.channel),
    );
    // TODO pendingClosingChannels is deprecated
    responsePendingChannels.pendingClosingChannels.map(
      async (chan) => chan.channel && setupAlias(chan.channel),
    );
    responsePendingChannels.pendingForceClosingChannels.map(
      async (chan) => chan.channel && setupAlias(chan.channel),
    );
    responsePendingChannels.waitingCloseChannels.map(
      async (chan) => chan.channel && setupAlias(chan.channel),
    );
  }),

  getChannelEvents: thunk(async (actions, _, { getStoreState }) => {
    const db = getStoreState().db;
    if (!db) {
      throw new Error("getChannelEvents(): db not ready");
    }
    const channelEvents = await getChannelEvents(db);
    actions.setChannelEvents(channelEvents);
  }),

  connectAndOpenChannel: thunk(
    async (_, { peer, amount, feeRateSat, type }, { getStoreActions }) => {
      const [pubkey, host] = peer.split("@");
      try {
        await connectPeer({
          addr: {
            host,
            pubkey,
          },
        });
      } catch (error: any) {
        if (!error.message.includes("already connected to peer")) {
          throw error;
        }
      }

      try {
        const nodeInfo = await getNodeInfo({
          pubKey: pubkey,
        });

        // Check for anchors features
        const features = nodeInfo.node?.features;

        const isAnchorSupported = features ? features["23"] : undefined;

        // Stop opening if anchors is not supported
        if (!isAnchorSupported) {
          throw new Error("Anchor channels are not supported by the remote node");
        }
      } catch (error: any) {
        // If the node is not in channel graph for some reason, ignore anchor check and still open
        // the channel
        if (!error.message.includes("unable to find node")) {
          throw error;
        }
      }

      const result = await openChannelSync({
        nodePubkeyString: pubkey,
        localFundingAmount: BigInt(amount),
        targetConf: feeRateSat ? undefined : 2,
        private: true,
        satPerByte: feeRateSat ? BigInt(feeRateSat) : undefined,
        scidAlias: true,
        commitmentType: type,
        remoteChanReserveSat: BigInt(1000),
      });

      // TURBOTODO this is weird...
      const txId = (result.fundingTxid.value as Uint8Array).reverse();
      getStoreActions().onChain.addToTransactionNotificationBlacklist(bytesToHexString(txId));
      // getStoreActions().onChain.addToTransactionNotificationBlacklist(
      //   bytesToHexString(result.fundingTxidBytes.reverse()),
      // );
      log.d("openChannel", [result]);
      return result;
    },
  ),

  connectAndOpenChannelAll: thunk(async (_, { peer, feeRateSat, type }, { getStoreActions }) => {
    const [pubkey, host] = peer.split("@");
    try {
      await connectPeer({
        addr: {
          host,
          pubkey,
        },
      });
    } catch (e: any) {
      if (!e.message.includes("already connected to peer")) {
        throw e;
      }
    }

    try {
      const nodeInfo = await getNodeInfo({
        pubKey: pubkey,
      });

      // Check for anchors features
      const features = nodeInfo.node?.features;

      const isAnchorSupported = features ? features["23"] : undefined;

      // Stop opening if anchors is not supported
      if (!isAnchorSupported) {
        throw new Error("Anchor channels are not supported by the remote node");
      }
    } catch (error: any) {
      // If the node is not in channel graph for some reason, ignore anchor check and still open
      // the channel
      if (!error.message.includes("unable to find node")) {
        throw error;
      }
    }

    const result = await openChannelSync({
      nodePubkeyString: pubkey,
      targetConf: feeRateSat ? undefined : 2,
      private: true,
      satPerByte: feeRateSat ? BigInt(feeRateSat) : undefined,
      scidAlias: true,
      commitmentType: type,
      remoteChanReserveSat: BigInt(1000),
      fundMax: true,
    });

    // TURBOTODO this is weird...
    const txId = (result.fundingTxid.value as Uint8Array).reverse();
    getStoreActions().onChain.addToTransactionNotificationBlacklist(bytesToHexString(txId));
    log.d("openChannel", [result]);
    return result;
  }),

  closeChannel: thunk(
    async (actions, { fundingTx, outputIndex, force, deliveryAddress }, { getStoreActions }) => {
      const unsubscribe = closeChannel(
        {
          channelPoint: {
            fundingTxid: {
              case: "fundingTxidStr",
              value: fundingTx,
            },
            outputIndex,
          },

          force,
          deliveryAddress,
        },
        (result) => {
          actions.getChannels();

          if (result.update.case === "chanClose") {
            unsubscribe();
          }
        },
        (error) => {
          toast("closeChannel: " + error, undefined, "danger");
        },
      );

      getStoreActions().onChain.addToTransactionNotificationBlacklist(fundingTx);
    },
  ),

  abandonChannel: thunk(async (_, { fundingTx, outputIndex }) => {
    const result = await abandonChannel({
      channelPoint: {
        fundingTxid: {
          case: "fundingTxidStr",
          value: fundingTx,
        },
        outputIndex,
      },
    });

    log.d("abandonChannel", [result]);
    return result;
  }),

  exportChannelsBackup: thunk(async (_, _2, {}) => {
    const response = await exportAllChannelBackups({});
    if (response.multiChanBackup && response.multiChanBackup.multiChanBackup) {
      const exportResponse = await NativeModules.LndMobileTools.saveChannelsBackup(
        base64.fromByteArray(response.multiChanBackup.multiChanBackup),
      );
      return exportResponse;
    } else {
      throw new Error("Export failed");
    }
  }),

  exportChannelBackupFile: thunk(async () => {
    return await NativeModules.LndMobileTools.saveChannelBackupFile();
  }),

  getBalance: thunk(async (actions, _, {}) => {
    const response = await channelBalance({}); // response.balance is not Long for some reason
    actions.setBalance(response.balance);
    actions.setPendingOpenBalance(response.pendingOpenBalance);
    await setItemObject(StorageItem.lightningBalance, response.balance.toString());
  }),

  setPendingChannels: action((state, payload) => {
    state.pendingOpenChannels = payload.pendingOpenChannels;
    state.pendingClosingChannels = payload.pendingClosingChannels;
    state.pendingForceClosingChannels = payload.pendingForceClosingChannels;
    state.waitingCloseChannels = payload.waitingCloseChannels;
  }),

  setChannels: action((state, payload) => {
    state.channels = payload;
  }),
  setChannelEvents: action((state, payload) => {
    state.channelEvents = payload;
  }),
  addChannelEvent: action((state, payload) => {
    state.channelEvents.push(payload);
  }),
  setChannelUpdateSubscriptionStarted: action((state, payload) => {
    state.channelUpdateSubscriptionStarted = payload;
  }),
  setAlias: action((state, payload) => {
    state.aliases[payload.pubkey] = payload.alias;
  }),
  setBalance: action((state, payload) => {
    state.balance = payload;
  }),
  setPendingOpenBalance: action((state, payload) => {
    state.pendingOpenBalance = payload;
  }),

  channels: [],
  aliases: {},
  pendingOpenChannels: [],
  pendingClosingChannels: [],
  pendingForceClosingChannels: [],
  waitingCloseChannels: [],
  channelUpdateSubscriptionStarted: false,
  balance: BigInt(0),
  remoteBalance: computed((store) => {
    return store.channels
      .filter((channel) => channel.active)
      .reduce((prev, currChannel) => prev + (currChannel.remoteBalance || BigInt(0)), BigInt(0));
  }),
  pendingOpenBalance: BigInt(0),
  channelEvents: [],
};

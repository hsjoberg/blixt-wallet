import { Action, Thunk, action, thunk } from "easy-peasy";
import { BLIXT_NODE_PUBKEY } from "../utils/constants";
import { toast } from "../utils";
import type { IStoreInjections } from "./store";
import type { IStoreModel } from "./index";
import { Alert } from "../utils/alert";
import logger from "./../utils/log";

import { getNodeInfo, subscribeTransactions } from "react-native-turbo-lnd";
import { convertBitcoinToFiat, formatBitcoin } from "../utils/bitcoin-units";

const log = logger("Autopilot");

export interface IAutopilotModel {
  initialize: Thunk<IAutopilotModel, void, IStoreInjections, IStoreModel>;
  checkAutopilot: Thunk<
    IAutopilotModel,
    { force?: boolean } | undefined,
    IStoreInjections,
    IStoreModel,
    Promise<void>
  >;

  setAutopilotPrompting: Action<IAutopilotModel, boolean>;
  setAutopilotOpening: Action<IAutopilotModel, boolean>;
  setTransactionSubscriptionStarted: Action<IAutopilotModel, boolean>;

  autopilotPrompting: boolean;
  autopilotOpening: boolean;
  transactionSubscriptionStarted: boolean;
}

export const autopilot: IAutopilotModel = {
  initialize: thunk(async (actions, _, { getState, getStoreActions, getStoreState }) => {
    log.i("Initializing");
    if (getState().transactionSubscriptionStarted) {
      log.d("Autopilot.initialize called when subscription already started");
      return;
    }

    subscribeTransactions(
      {},
      async (transaction) => {
        try {
          if (
            transaction.numConfirmations < 1 ||
            getStoreState().onChain.transactionNotificationBlacklist.includes(transaction.txHash)
          ) {
            return;
          }

          log.i("Event SubscribeTransactions", [transaction.txHash]);
          log.i("Running checkAutopilot()");
          await actions.checkAutopilot();
        } catch (error: any) {
          toast(error.message, undefined, "danger");
        }
      },
      (error) => {
        log.e("Got error from SubscribeTransactions", [error]);
      },
    );

    actions.setTransactionSubscriptionStarted(true);
    await getStoreActions().onChain.getBalance();
  }),

  checkAutopilot: thunk(
    async (actions, payload = {}, { getState, getStoreState, getStoreActions }) => {
      const autopilotPrompting = getState().autopilotPrompting;
      const autopilotOpening = getState().autopilotOpening;
      const autopilotNodePubkey = getStoreState().settings.autopilotNodePubkey;
      const autopilotEnabled = getStoreState().settings.autopilotEnabled;

      log.i("checkAutopilot()", [
        "autopilotPrompting " + autopilotPrompting,
        "autopilotOpening " + autopilotOpening,
        "autopilotNodePubkey " + autopilotNodePubkey,
        "autopilotEnabled " + autopilotEnabled,
      ]);

      if (!autopilotEnabled && !payload.force) {
        return;
      }

      if (!autopilotNodePubkey) {
        return;
      }

      if (autopilotPrompting || autopilotOpening) {
        return;
      }

      if (!getStoreState().lightning.syncedToChain) {
        log.d("Not synced to chain, skipping");
        return;
      }

      const availableBalance = getStoreState().onChain.balance;
      // We need at least 22,000 satoshi to open a channel, 20k sats is usually the limit node's set
      // and the user needs some more for transaction fees.
      if (availableBalance < 22000n) {
        return;
      }

      await getStoreActions().channel.getChannels();
      const channelState = getStoreState().channel;
      const hasActiveChannel =
        channelState.channels.find((channel) => channel.remotePubkey === autopilotNodePubkey) !==
        undefined;
      const hasPendingChannel =
        channelState.pendingOpenChannels.find(
          (channel) => channel.channel?.remoteNodePub === autopilotNodePubkey,
        ) !== undefined;

      if (hasActiveChannel || hasPendingChannel) {
        return;
      }

      const bitcoinUnit = getStoreState().settings.bitcoinUnit;
      const currentRate = getStoreState().fiat.currentRate;
      const fiatUnit = getStoreState().settings.fiatUnit;

      const availableBalanceFormatted = formatBitcoin(availableBalance, bitcoinUnit);
      const availableBalanceInFiatFormatted = convertBitcoinToFiat(
        availableBalance,
        currentRate,
        fiatUnit,
      );

      actions.setAutopilotPrompting(true);
      try {
        const peer = await getAutopilotPeerUri(autopilotNodePubkey);
        let feeRate = undefined;

        let message = `You have ${availableBalanceFormatted} (${availableBalanceInFiatFormatted}) on chain.\n\n`;
        if (BLIXT_NODE_PUBKEY === autopilotNodePubkey) {
          message += `Would you like to open a new channel to the Blixt LSP node now?`;
        } else {
          message += `Would you like to open a new channel to the configured autopilot node (${autopilotNodePubkey}) now?`;
        }

        const prompt = await Alert.promiseAlert("Automatic channel opening", message, [
          { text: "No and disable autopilot", style: "cancel" },
          { text: "Yes and set custom feerate" },
          { text: "Yes" },
        ]);

        if (prompt.style === "cancel") {
          await getStoreActions().settings.changeAutopilotEnabled(false);
          return;
        }

        if (prompt.text === "Yes and set custom feerate") {
          const prompt = await Alert.promisePromptCallback(
            "Set custom feerate",
            "Enter the feerate in sat/vB for opening the channel",
          );

          feeRate = Number.parseInt(prompt, 10);

          if (feeRate === -1 || Number.isNaN(feeRate) || feeRate < 0 || feeRate > 100) {
            Alert.alert(
              "Invalid feerate",
              `Invalid feerate "${prompt}".\n\nPlease enter a value between 1 and 100`,
            );
            return;
          }
        }

        actions.setAutopilotOpening(true);
        try {
          await getStoreActions().channel.connectAndOpenChannelAll({ peer, feeRateSat: feeRate });
          await getStoreActions().channel.getChannels();
        } finally {
          actions.setAutopilotOpening(false);
        }
      } catch (error: any) {
        log.e("Auto-open channel failed", [error]);
        toast(`Error while auto-opening channel: ${error.message}`, 20000, "danger", "OK");
      } finally {
        actions.setAutopilotPrompting(false);
      }
    },
  ),

  setAutopilotPrompting: action((state, payload) => {
    state.autopilotPrompting = payload;
  }),
  setAutopilotOpening: action((state, payload) => {
    state.autopilotOpening = payload;
  }),
  setTransactionSubscriptionStarted: action((state, payload) => {
    state.transactionSubscriptionStarted = payload;
  }),

  autopilotPrompting: false,
  autopilotOpening: false,
  transactionSubscriptionStarted: false,
};

const getAutopilotPeerUri = async (nodePubkey: string): Promise<string> => {
  if (!nodePubkey) {
    return nodePubkey;
  }

  try {
    const nodeInfo = await getNodeInfo({ pubKey: nodePubkey });
    const nodeAddress = nodeInfo.node?.addresses?.find(
      ({ addr }) => typeof addr === "string" && addr.length > 0,
    );
    if (nodeAddress?.addr) {
      return `${nodePubkey}@${nodeAddress.addr}`;
    }
  } catch (error: any) {
    log.w("Could not get node address from graph for autopilot peer", [error.message]);
  }

  return nodePubkey;
};

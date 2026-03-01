import { Action, Thunk, action, thunk } from "easy-peasy";
import { BLIXT_NODE_PUBKEY } from "../utils/constants";
import { toast } from "../utils";
import type { IStoreModel } from "./index";
import { Alert } from "../utils/alert";
import logger from "./../utils/log";

import { getNodeInfo, subscribeTransactions, walletBalance } from "react-native-turbo-lnd";
import { convertBitcoinToFiat, formatBitcoin } from "../utils/bitcoin-units";
import { NodeInfo } from "react-native-turbo-lnd/protos/lightning_pb";

const log = logger("Autopilot");

export interface IAutopilotModel {
  initialize: Thunk<IAutopilotModel, void, any, IStoreModel>;
  checkAutopilot: Thunk<
    IAutopilotModel,
    { force?: boolean } | undefined,
    any,
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
          log.i("Event SubscribeTransactions", [transaction.txHash]);
          if (
            transaction.numConfirmations < 1 ||
            getStoreState().onChain.transactionNotificationBlacklist.includes(transaction.txHash) ||
            Number(transaction.amount) < 0
          ) {
            return;
          }

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
      const torEnabled = getStoreState().settings.torEnabled;

      log.i("checkAutopilot()", [
        "autopilotPrompting " + autopilotPrompting,
        "autopilotOpening " + autopilotOpening,
        "autopilotNodePubkey " + autopilotNodePubkey,
        "autopilotEnabled " + autopilotEnabled,
        "force " + payload.force,
      ]);

      if (!autopilotEnabled && !payload.force) {
        log.d("Autopilot is not enabled, skipping");
        return;
      }

      if (!autopilotNodePubkey) {
        log.d("Autopilot node pubkey is not set, skipping");
        return;
      }

      if (autopilotPrompting || autopilotOpening) {
        log.d("Autopilot is already prompting or opening, skipping");
        return;
      }

      if (!getStoreState().lightning.syncedToChain) {
        log.d("Not synced to chain, skipping");
        return;
      }

      const balance = await walletBalance({});
      const availableBalance = balance.confirmedBalance;
      // We need at least 22,000 satoshi to open a channel, 20k sats is usually the limit node's set
      // and the user needs some more for transaction fees.
      if (!payload.force && availableBalance < 22000n) {
        log.d("Available balance is less than 22,000 satoshi, skipping");
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
        const peer = await getAutopilotPeerUri(autopilotNodePubkey, torEnabled);
        let feeRate = undefined;

        let message = `You have ${availableBalanceFormatted} (${availableBalanceInFiatFormatted}) on chain.\n\n`;
        if (BLIXT_NODE_PUBKEY === autopilotNodePubkey) {
          message += `Would you like to open a new channel to the Blixt LSP node now?`;
        } else {
          message += `Would you like to open a new channel to the configured autopilot node (${autopilotNodePubkey}) now?`;
        }

        const prompt = await Alert.promiseAlert("Automatic channel opening", message, [
          { text: "Yes" },
          { text: "Yes and set custom feerate" },
          { text: "No and disable autopilot", style: "cancel" },
        ]);

        if (prompt.style === "cancel") {
          await getStoreActions().settings.changeAutopilotEnabled(false);
          return;
        }

        if (prompt.text === "Yes and set custom feerate") {
          const feeRatePrompt = await Alert.promisePromptCallback(
            "Set custom feerate",
            "Enter the feerate in sat/vB for opening the channel (1-100).",
            "plain-text",
            undefined,
            "number-pad",
          );
          if (feeRatePrompt === null) {
            log.i("User cancelled feerate prompt");
            return;
          }

          feeRate = Number.parseInt(feeRatePrompt, 10);

          if (feeRate === -1 || Number.isNaN(feeRate) || feeRate < 1 || feeRate > 100) {
            Alert.alert(
              "Invalid feerate",
              `Invalid feerate "${feeRatePrompt}".\n\nPlease enter a value between 1 and 100`,
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
        if (getStoreState().lightning.syncedToGraph) {
          toast(`Error while auto-opening channel: ${error.message}`, 30000, "danger", "OK");
        } else {
          log.i("Skipping autopilot error toast before graph sync; will retry after sync");
        }
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

/**
 *
 * @throws Error if the node pubkey is not found in the graph or if no suitable address is found
 * @returns The peer URI for the autopilot peer
 */
const getAutopilotPeerUri = async (nodePubkey: string, preferTor: boolean): Promise<string> => {
  let nodeInfo: NodeInfo;
  try {
    nodeInfo = await getNodeInfo({ pubKey: nodePubkey });
  } catch (error: any) {
    log.w("Could not get node address from graph for autopilot peer", [error.message]);
    throw new Error(`Could not get node address from graph for autopilot peer: ${error.message}`);
  }

  const nodeAddresses =
    nodeInfo.node?.addresses?.filter(({ addr }) => typeof addr === "string" && addr.length > 0) ??
    [];

  const torAddress = nodeAddresses.find(({ addr }) => addr.toLowerCase().includes(".onion"));
  const clearnetAddress = nodeAddresses.find(({ addr }) => !addr.toLowerCase().includes(".onion"));

  let nodeAddress: (typeof nodeAddresses)[number] | undefined;
  if (preferTor) {
    if (torAddress) {
      nodeAddress = torAddress;
    } else if (clearnetAddress) {
      nodeAddress = clearnetAddress;
    }
  } else {
    if (clearnetAddress) {
      nodeAddress = clearnetAddress;
    }
  }
  if (!nodeAddress) {
    throw new Error("No suitable address found for autopilot peer");
  }

  return `${nodePubkey}@${nodeAddress.addr}`;
};

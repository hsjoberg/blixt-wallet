import { DeviceEventEmitter } from "react-native";
import { Action, action, Thunk, thunk, Computed, computed } from "easy-peasy";
import Long from "long";

import { IStoreModel } from "./index";
import { IStoreInjections } from "./store";
import { lnrpc } from "../../proto/proto";

import logger from "./../utils/log";
import { decodeSubscribeTransactionsResult } from "../lndmobile/onchain";
import { LndMobileEventEmitter } from "../utils/event-listener";
const log = logger("OnChain");

export interface IBlixtTransaction extends lnrpc.ITransaction {
  type: "NORMAL" | "CHANNEL_OPEN" | "CHANNEL_CLOSE";
}

export interface ISetTransactionsPayload {
  transactions: IBlixtTransaction[];
}

export interface IGetAddressPayload {
  forceNew?: boolean;
  p2sh?: boolean;
}

export interface ISendCoinsPayload {
  address: string;
  sat: number;
  feeRate?: number;
}

export interface ISendCoinsAllPayload {
  address: string;
  feeRate?: number;
}

export interface IOnChainModel {
  initialize: Thunk<IOnChainModel, void, IStoreInjections, IStoreModel>;
  getBalance: Thunk<IOnChainModel, void, IStoreInjections>;
  getAddress: Thunk<IOnChainModel, IGetAddressPayload, IStoreInjections>;
  getTransactions: Thunk<IOnChainModel, void, IStoreInjections, IStoreModel>;
  sendCoins: Thunk<IOnChainModel, ISendCoinsPayload, IStoreInjections, any, Promise<lnrpc.ISendCoinsResponse>>;
  sendCoinsAll: Thunk<IOnChainModel, ISendCoinsAllPayload, IStoreInjections, any, Promise<lnrpc.ISendCoinsResponse>>;

  setBalance: Action<IOnChainModel, lnrpc.IWalletBalanceResponse>;
  setUnconfirmedBalance: Action<IOnChainModel, lnrpc.IWalletBalanceResponse>;
  setAddress: Action<IOnChainModel, lnrpc.NewAddressResponse>;
  setAddressType: Action<IOnChainModel, lnrpc.AddressType>;
  setTransactions: Action<IOnChainModel, ISetTransactionsPayload>;
  setTransactionSubscriptionStarted: Action<IOnChainModel, boolean>;

  addToTransactionNotificationBlacklist: Action<IOnChainModel, string>;

  balance: Long;
  unconfirmedBalance: Long;
  totalBalance: Computed<IOnChainModel, Long>;
  address?: string;
  addressType?: lnrpc.AddressType;
  transactions: IBlixtTransaction[];
  transactionSubscriptionStarted: boolean;

  getOnChainTransactionByTxId: Computed<IOnChainModel, (txId: string) => lnrpc.ITransaction | undefined>;

  transactionNotificationBlacklist: string[];
}

export const onChain: IOnChainModel = {
  initialize: thunk(async (actions, _, { getState, getStoreActions, getStoreState, injections }) => {
    log.i("Initializing");
    await Promise.all([
      actions.getAddress({}),
      actions.getBalance(undefined),
    ]);

    if (getState().transactionSubscriptionStarted) {
      log.d("OnChain.initialize called when subscription already started");
      return;
    }
    else {
      await injections.lndMobile.onchain.subscribeTransactions();
      LndMobileEventEmitter.addListener("SubscribeTransactions", async (e: any) => {
        log.d("Event SubscribeTransactions", [e]);
        if (e.data === "") {
          log.i("Got e.data empty from SubscribeTransactions. Skipping transaction");
          return;
        }
        await actions.getBalance();

        if (getStoreState().onboardingState === "SEND_ONCHAIN") {
          log.i("Changing onboarding state to DO_BACKUP");
          getStoreActions().changeOnboardingState("DO_BACKUP");
        }

        const transaction = decodeSubscribeTransactionsResult(e.data);
        if (
            !getState().transactionNotificationBlacklist.includes(transaction.txHash) &&
            transaction.numConfirmations > 0 &&
            Long.isLong(transaction.amount) &&
            transaction.amount.greaterThan(0)
          ) {
          getStoreActions().notificationManager.localNotification({
            message: "Received on-chain transaction",
            importance: "high",
          });
          actions.addToTransactionNotificationBlacklist(transaction.txHash);
        }
      });

      actions.setTransactionSubscriptionStarted(true);
    }
    return true;
  }),

  getBalance: thunk(async (actions, _, { injections }) => {
    const { walletBalance } = injections.lndMobile.onchain;
    const walletBalanceResponse = await walletBalance();

    // There's a bug here where totalBalance is
    // set to 0 instead of Long(0)
    if ((walletBalanceResponse.totalBalance as unknown) === 0) {
      walletBalanceResponse.totalBalance = Long.fromNumber(0);
    }
    if ((walletBalanceResponse.confirmedBalance as unknown) === 0) {
      walletBalanceResponse.confirmedBalance = Long.fromNumber(0);
    }
    if ((walletBalanceResponse.unconfirmedBalance as unknown) === 0) {
      walletBalanceResponse.unconfirmedBalance = Long.fromNumber(0);
    }
    actions.setBalance(walletBalanceResponse);
    actions.setUnconfirmedBalance(walletBalanceResponse);
  }),

  getAddress: thunk(async (actions, { forceNew, p2sh }, { injections }) => {
    const { newAddress } = injections.lndMobile.onchain;
    let type: lnrpc.AddressType;

    if (forceNew) {
      if (p2sh) {
        type = lnrpc.AddressType.NESTED_PUBKEY_HASH;
      } else {
        type = lnrpc.AddressType.WITNESS_PUBKEY_HASH;
      }
    } else {
      if (p2sh) {
        type = lnrpc.AddressType.UNUSED_NESTED_PUBKEY_HASH;
      } else {
        type = lnrpc.AddressType.UNUSED_WITNESS_PUBKEY_HASH;
      }
    }

    const newAddressResponse = await newAddress(type);

    actions.setAddress(newAddressResponse);
    actions.setAddressType(type);
  }),

  getTransactions: thunk(async (actions, _, { getStoreState, injections }) => {
    const { getTransactions } = injections.lndMobile.onchain;
    const channelEvents = getStoreState().channel.channelEvents;
    const transactionDetails = await getTransactions();

    const transactions: IBlixtTransaction[] = [];
    for (const tx of transactionDetails.transactions) {
      let type: IBlixtTransaction["type"] = "NORMAL";
      const matchChannelEvent = channelEvents.find((channelEvent) => channelEvent.txId === tx.txHash);
      if (matchChannelEvent) {
        switch (matchChannelEvent.type) {
          case "OPEN":
            type = "CHANNEL_OPEN";
          break;
          case "CLOSE":
            type = "CHANNEL_CLOSE";
          break;
        }
      }
      transactions.push({
        ...tx,
        type,
      });
    }

    actions.setTransactions({ transactions });
  }),

  sendCoins: thunk(async (actions, { address, sat, feeRate }, { injections }) => {
    const { sendCoins } = injections.lndMobile.onchain;
    const response = await sendCoins(address, sat, feeRate );
    actions.addToTransactionNotificationBlacklist(response.txid);
    return response;
  }),

  sendCoinsAll: thunk(async (actions, { address, feeRate }, { injections }) => {
    const { sendCoinsAll } = injections.lndMobile.onchain;
    const response = await sendCoinsAll(address, feeRate);
    actions.addToTransactionNotificationBlacklist(response.txid);
    return response;
  }),

  setBalance: action((state, payload) => { state.balance = payload.confirmedBalance!; }),
  setUnconfirmedBalance: action((state, payload) => { state.unconfirmedBalance = payload.unconfirmedBalance!; }),
  setAddress: action((state, payload) => { state.address = payload.address; }),
  setAddressType: action((state, payload) => { state.addressType = payload; }),
  setTransactions: action((state, payload) => { state.transactions = payload.transactions; }),
  setTransactionSubscriptionStarted: action((state, payload) => { state.transactionSubscriptionStarted = payload }),

  addToTransactionNotificationBlacklist: action((state, payload) => {
    state.transactionNotificationBlacklist = [...state.transactionNotificationBlacklist, payload];
  }),

  balance: Long.fromInt(0),
  unconfirmedBalance: Long.fromInt(0),
  totalBalance: computed((state) => state.balance.add(state.unconfirmedBalance)),
  transactions: [],
  transactionSubscriptionStarted: false,

  getOnChainTransactionByTxId: computed(
    (state) => {
      return (txId: string) => {
        return state.transactions.find((tx) => {
          return txId === tx.txHash;
        });
      };
    },
  ),

  transactionNotificationBlacklist: [],
};

import { Action, action, Thunk, thunk, Computed, computed } from "easy-peasy";

import { IStoreModel } from "./index";
import { IStoreInjections } from "./store";
import { toast } from "../utils";

import {
  getTransactions,
  newAddress,
  sendCoins,
  subscribeTransactions,
  walletBalance,
  walletKitBumpFee,
} from "react-native-turbo-lnd";
import {
  AddressType,
  GetTransactionsRequestSchema,
  NewAddressResponse,
  SendCoinsResponse,
  Transaction,
  WalletBalanceResponse,
} from "react-native-turbo-lnd/protos/lightning_pb";

import logger from "./../utils/log";
import { create } from "@bufbuild/protobuf";
import { BumpFeeResponse } from "react-native-turbo-lnd/protos/walletrpc/walletkit_pb";
const log = logger("OnChain");

export interface IBlixtTransaction extends Transaction {
  type: "NORMAL" | "CHANNEL_OPEN" | "CHANNEL_CLOSE";
}

export interface ISetTransactionsPayload {
  transactions: IBlixtTransaction[];
}

export interface IGetAddressPayload {
  forceNew?: boolean;
  p2wkh?: boolean;
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

export interface IBumpFeePayload {
  feeRate: number;
  txid: string;
  index: number;
}

export interface IOnChainModel {
  initialize: Thunk<IOnChainModel, void, IStoreInjections, IStoreModel>;
  getBalance: Thunk<IOnChainModel, void, IStoreInjections>;
  getAddress: Thunk<IOnChainModel, IGetAddressPayload, IStoreInjections, IStoreModel>;
  getTransactions: Thunk<IOnChainModel, void, IStoreInjections, IStoreModel>;
  sendCoins: Thunk<
    IOnChainModel,
    ISendCoinsPayload,
    IStoreInjections,
    any,
    Promise<SendCoinsResponse>
  >;
  sendCoinsAll: Thunk<
    IOnChainModel,
    ISendCoinsAllPayload,
    IStoreInjections,
    any,
    Promise<SendCoinsResponse>
  >;

  setBalance: Action<IOnChainModel, WalletBalanceResponse>;
  setUnconfirmedBalance: Action<IOnChainModel, WalletBalanceResponse>;
  setAddress: Action<IOnChainModel, NewAddressResponse>;
  setAddressType: Action<IOnChainModel, AddressType>;
  setTransactions: Action<IOnChainModel, ISetTransactionsPayload>;
  setTransactionSubscriptionStarted: Action<IOnChainModel, boolean>;

  addToTransactionNotificationBlacklist: Action<IOnChainModel, string>;

  balance: bigint;
  unconfirmedBalance: bigint;
  totalBalance: Computed<IOnChainModel, bigint>;
  address?: string;
  addressType?: AddressType;
  transactions: IBlixtTransaction[];
  transactionSubscriptionStarted: boolean;

  getOnChainTransactionByTxId: Computed<IOnChainModel, (txId: string) => Transaction | undefined>;

  transactionNotificationBlacklist: string[];
  bumpFee: Thunk<IOnChainModel, IBumpFeePayload, IStoreInjections, any, Promise<BumpFeeResponse>>;
}

export const onChain: IOnChainModel = {
  initialize: thunk(
    async (actions, _, { getState, getStoreActions, getStoreState, injections }) => {
      log.i("Initializing");
      await Promise.all([actions.getAddress({}), actions.getBalance(undefined)]);

      if (getState().transactionSubscriptionStarted) {
        log.d("OnChain.initialize called when subscription already started");
        return;
      } else {
        await injections.lndMobile.onchain.subscribeTransactions();
        subscribeTransactions(
          {},
          async (transaction) => {
            try {
              log.d("Event SubscribeTransactions", []);

              await actions.getBalance();

              if (getStoreState().onboardingState === "SEND_ONCHAIN") {
                log.i("Changing onboarding state to DO_BACKUP");
                getStoreActions().changeOnboardingState("DO_BACKUP");
              }

              if (
                !getState().transactionNotificationBlacklist.includes(transaction.txHash) &&
                transaction.numConfirmations > 0 &&
                Number(transaction.amount) > 0
              ) {
                getStoreActions().notificationManager.localNotification({
                  message: "Received on-chain transaction",
                });
                actions.addToTransactionNotificationBlacklist(transaction.txHash);

                actions.getTransactions();
              }
            } catch (error: any) {
              toast(error.message, undefined, "danger");
            }
          },
          (error) => {
            log.e("Got error from SubscribeTransactions", [error]);
          },
        );

        actions.setTransactionSubscriptionStarted(true);
      }

      actions.getTransactions();
      return true;
    },
  ),

  getBalance: thunk(async (actions, _, { injections }) => {
    const walletBalanceResponse = await walletBalance({});

    actions.setBalance(walletBalanceResponse);
    actions.setUnconfirmedBalance(walletBalanceResponse);
  }),

  getAddress: thunk(async (actions, { forceNew, p2wkh }, { injections }) => {
    try {
      let type: AddressType;

      if (forceNew) {
        if (p2wkh) {
          type = AddressType.WITNESS_PUBKEY_HASH;
        } else {
          type = AddressType.TAPROOT_PUBKEY;
        }
      } else {
        if (p2wkh) {
          type = AddressType.UNUSED_WITNESS_PUBKEY_HASH;
        } else {
          type = AddressType.UNUSED_TAPROOT_PUBKEY;
        }
      }

      const newAddressResponse = await newAddress({
        type,
      });

      actions.setAddress(newAddressResponse);
      actions.setAddressType(type);
    } catch (error: any) {
      throw new Error("Error while generating bitcoin address: " + error.message);
    }
  }),

  getTransactions: thunk(async (actions, _, { getStoreState, injections }) => {
    const transactionDetails = await getTransactions(create(GetTransactionsRequestSchema));
    const channelEvents = getStoreState().channel.channelEvents;

    const transactions: IBlixtTransaction[] = [];
    for (const tx of transactionDetails.transactions) {
      let type: IBlixtTransaction["type"] = "NORMAL";
      const matchChannelEvent = channelEvents.find(
        (channelEvent) => channelEvent.txId === tx.txHash,
      );
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
    const response = await sendCoins({
      addr: address,
      amount: BigInt(sat),
      satPerVbyte: feeRate ? BigInt(feeRate) : undefined,
    });

    actions.addToTransactionNotificationBlacklist(response.txid);
    return response;
  }),

  sendCoinsAll: thunk(async (actions, { address, feeRate }, { injections }) => {
    const response = await sendCoins({
      sendAll: true,
      addr: address,
      satPerVbyte: feeRate ? BigInt(feeRate) : undefined,
    });

    actions.addToTransactionNotificationBlacklist(response.txid);
    return response;
  }),

  bumpFee: thunk(async (_, { feeRate, txid, index }, { injections }) => {
    const response = await walletKitBumpFee({
      satPerVbyte: BigInt(feeRate),
      outpoint: {
        txidStr: txid,
        outputIndex: index,
      },
    });

    return response;
  }),

  setBalance: action((state, payload) => {
    state.balance = BigInt(payload.confirmedBalance?.toString() || "0");
  }),
  setUnconfirmedBalance: action((state, payload) => {
    state.unconfirmedBalance = BigInt(payload.unconfirmedBalance?.toString() || "0");
  }),
  setAddress: action((state, payload) => {
    state.address = payload.address;
  }),
  setAddressType: action((state, payload) => {
    state.addressType = payload;
  }),
  setTransactions: action((state, payload) => {
    state.transactions = payload.transactions;
  }),
  setTransactionSubscriptionStarted: action((state, payload) => {
    state.transactionSubscriptionStarted = payload;
  }),

  addToTransactionNotificationBlacklist: action((state, payload) => {
    state.transactionNotificationBlacklist = [...state.transactionNotificationBlacklist, payload];
  }),

  balance: BigInt(0),
  unconfirmedBalance: BigInt(0),
  totalBalance: computed((state) => state.balance + state.unconfirmedBalance),
  transactions: [],
  transactionSubscriptionStarted: false,

  getOnChainTransactionByTxId: computed((state) => {
    return (txId: string) => {
      return state.transactions.find((tx) => {
        return txId === tx.txHash;
      });
    };
  }),

  transactionNotificationBlacklist: [],
};

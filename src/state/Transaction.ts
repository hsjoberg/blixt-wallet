import { LayoutAnimation } from "react-native";
import { Thunk, thunk, Action, action, Computed, computed } from "easy-peasy";
import {
  ITransaction,
  getTransactions,
  createTransaction,
  updateTransaction,
} from "../storage/database/transaction";

import { IStoreModel } from "./index";
import { IStoreInjections } from "./store";
import { lnrpc } from "../../proto/lightning";
import { bytesToHexString, hexToUint8Array } from "../utils";

import Long from "long";

import logger from "./../utils/log";
const log = logger("Transaction");

// let lock = Promise.resolve();

export interface ITransactionModel {
  addTransaction: Action<ITransactionModel, ITransaction>;
  updateTransaction: Action<ITransactionModel, { transaction: ITransaction }>;

  syncTransaction: Thunk<ITransactionModel, ITransaction, any, IStoreModel>;

  getTransactions: Thunk<ITransactionModel, undefined, any, IStoreModel>;
  checkOpenTransactions: Thunk<ITransactionModel, undefined, IStoreInjections, IStoreModel>;
  setTransactions: Action<ITransactionModel, ITransaction[]>;

  transactions: ITransaction[];
  getTransactionByRHash: Computed<ITransactionModel, (rHash: string) => ITransaction | undefined>;
  getTransactionByPreimage: Computed<
    ITransactionModel,
    (preimage: Uint8Array) => ITransaction | undefined
  >;
  getTransactionByPaymentRequest: Computed<
    ITransactionModel,
    (paymentRequest: string) => ITransaction | undefined
  >;
}

export const transaction: ITransactionModel = {
  /**
   * Synchronizes incoming transactions coming
   * from gGPRC `SubscribeInvoices` (Java backend), from listener in `Receive` store
   * Checks if we have it in our transaction array, otherwise create a new transaction in the db
   */
  syncTransaction: thunk(async (actions, tx, { getState, getStoreState }) => {
    const db = getStoreState().db;
    if (!db) {
      throw new Error("syncTransaction(): db not ready");
    }

    // Don't insert open transactions for AMP invoices
    if (tx.status === "OPEN" && tx.ampInvoice) {
      return;
    }

    // If AMP invoice settles, insert a new tx
    if (tx.status === "SETTLED" && tx.ampInvoice) {
      const id = await createTransaction(db, tx);
      actions.addTransaction({ ...tx, id });

      return;
    }

    const transactions = getState().transactions;
    let foundTransaction = false;

    for (const txIt of transactions) {
      if (txIt.paymentRequest === tx.paymentRequest) {
        await updateTransaction(db, { ...txIt, ...tx });
        actions.updateTransaction({ transaction: { ...txIt, ...tx } });
        foundTransaction = true;
      }
    }

    if (!foundTransaction) {
      const id = await createTransaction(db, tx);
      actions.addTransaction({ ...tx, id });
    }
  }),

  /**
   * Updates a transaction in our transaction array
   */
  updateTransaction: action((state, payload) => {
    const { transaction: tx } = payload;

    for (let i = 0; i < state.transactions.length; i++) {
      if (state.transactions[i].rHash === tx.rHash) {
        state.transactions[i] = tx;
      }
    }
  }),

  /**
   * Add a transaction
   */
  addTransaction: action((state, tx) => {
    state.transactions.unshift(tx);
  }),

  /**
   * Get transactions from the db
   * and add it to our transaction array
   */
  getTransactions: thunk(async (actions, _, { getStoreState }) => {
    log.d("getTransactions()");
    const db = getStoreState().db;
    if (!db) {
      throw new Error("getTransactions(): db not ready");
    }
    const hideExpiredInvoices = getStoreState().settings.hideExpiredInvoices;

    const transactions = await getTransactions(db, !hideExpiredInvoices);
    actions.setTransactions(transactions);
    log.d("getTransactions() done");
  }),

  /**
   * On app start, check if any invoices have
   * been settled while we were away.
   */
  checkOpenTransactions: thunk(async (actions, _, { getState, getStoreState, injections }) => {
    const trackPayment = injections.lndMobile.index.trackPaymentV2Sync;
    const lookupInvoice = injections.lndMobile.index.lookupInvoice;
    const hideExpiredInvoices = getStoreState().settings.hideExpiredInvoices;
    const db = getStoreState().db;
    if (!db) {
      throw new Error("checkOpenTransactions(): db not ready");
    }

    for (const tx of getState().transactions) {
      if (tx.status === "OPEN") {
        log.i("trackpayment tx", [tx.rHash]);
        if (tx.valueMsat.isNegative()) {
          trackPayment(tx.rHash).then((trackPaymentResult) => {
            log.i("trackpayment status", [
              trackPaymentResult.status,
              trackPaymentResult.paymentHash,
            ]);
            if (trackPaymentResult.status === lnrpc.Payment.PaymentStatus.SUCCEEDED) {
              log.i("trackpayment updating tx [settled]");
              const updated: ITransaction = {
                ...tx,
                status: "SETTLED",
                preimage: hexToUint8Array(trackPaymentResult.paymentPreimage),
                hops:
                  trackPaymentResult.htlcs[0].route?.hops?.map((hop) => ({
                    chanId: hop.chanId ?? null,
                    chanCapacity: hop.chanCapacity ?? null,
                    amtToForward: hop.amtToForward || Long.fromInt(0),
                    amtToForwardMsat: hop.amtToForwardMsat || Long.fromInt(0),
                    fee: hop.fee || Long.fromInt(0),
                    feeMsat: hop.feeMsat || Long.fromInt(0),
                    expiry: hop.expiry || null,
                    pubKey: hop.pubKey || null,
                  })) ?? [],
              };
              // tslint:disable-next-line
              updateTransaction(db, updated).then(() =>
                actions.updateTransaction({ transaction: updated }),
              );
            } else if (trackPaymentResult.status === lnrpc.Payment.PaymentStatus.UNKNOWN) {
              log.i("trackpayment updating tx [unknown]");
              const updated: ITransaction = {
                ...tx,
                status: "UNKNOWN",
              };
              // tslint:disable-next-line
              updateTransaction(db, updated).then(() =>
                actions.updateTransaction({ transaction: updated }),
              );
            } else if (trackPaymentResult.status === lnrpc.Payment.PaymentStatus.FAILED) {
              log.i("trackpayment updating tx [failed]");
              const updated: ITransaction = {
                ...tx,
                status: "CANCELED",
              };
              // tslint:disable-next-line
              updateTransaction(db, updated).then(() =>
                actions.updateTransaction({ transaction: updated }),
              );
            }
          });
        } else {
          const check = await lookupInvoice(tx.rHash);
          if (Date.now() / 1000 > check.creationDate.add(check.expiry).toNumber()) {
            const updated: ITransaction = {
              ...tx,
              status: "EXPIRED",
            };
            // tslint:disable-next-line
            updateTransaction(db, updated).then(() => {
              actions.updateTransaction({ transaction: updated });
            });
          } else if (check.settled) {
            const updated: ITransaction = {
              ...tx,
              status: "SETTLED",
              value: check.amtPaidSat,
              valueMsat: check.amtPaidMsat,
              // TODO add valueUSD, valueFiat and valueFiatCurrency?
            };
            // tslint:disable-next-line
            updateTransaction(db, updated).then(() =>
              actions.updateTransaction({ transaction: updated }),
            );
          } else if (check.state === lnrpc.Invoice.InvoiceState.CANCELED) {
            const updated: ITransaction = {
              ...tx,
              status: "CANCELED",
            };
            // tslint:disable-next-line
            updateTransaction(db, updated).then(() => {
              actions.updateTransaction({ transaction: updated });
            });
          }
        }
      }
    }
    return true;
  }),

  /**
   * Set transactions to our transaction array
   */
  setTransactions: action((state, transactions) => {
    state.transactions = transactions;
  }),

  transactions: [],
  getTransactionByRHash: computed((state) => {
    return (rHash: string) => {
      return state.transactions.find((tx) => rHash === tx.rHash);
    };
  }),

  getTransactionByPreimage: computed((state) => {
    return (preimage: Uint8Array) => {
      return state.transactions.find(
        (tx) => bytesToHexString(preimage) === bytesToHexString(tx.preimage),
      );
    };
  }),

  getTransactionByPaymentRequest: computed((state) => {
    return (paymentRequest: string) => {
      return state.transactions.find((tx) => {
        return paymentRequest === tx.paymentRequest;
      });
    };
  }),
};

import { Thunk, thunk, Action, action, Computed, computed } from "easy-peasy";
import { ITransaction, getTransactions, createTransaction, updateTransaction } from "../storage/database/transaction";

import { IStoreModel } from "./index";
import { IStoreInjections } from "./store";

export interface ITransactionModel {
  addTransaction: Action<ITransactionModel, ITransaction>;
  updateTransaction: Action<ITransactionModel, { transaction: ITransaction }>;

  syncTransaction: Thunk<ITransactionModel, ITransaction, any, IStoreModel>;

  getTransactions: Thunk<ITransactionModel, undefined, any, IStoreModel>;
  checkOpenTransactions: Thunk<ITransactionModel, undefined, IStoreInjections, IStoreModel>;
  setTransactions: Action<ITransactionModel, ITransaction[]>;

  transactions: ITransaction[];
  getTransactionByRHash: Computed<ITransactionModel, (rHash: string) => ITransaction | undefined>;
  getTransactionByPaymentRequest: Computed<ITransactionModel, (paymentRequest: string) => ITransaction | undefined>;
}

export const transaction: ITransactionModel = {
  /**
   * Synchronizes incoming transactions coming
   * from gGPRC `SubscribeInvoices` (Java backend), from listener in `Receive` store
   * Checks if we have it in our transaction array, otherwise create a new transaction in the db
   */
  syncTransaction: thunk(async (actions, tx, { getState, getStoreState } ) => {
    const db = getStoreState().db;
    if (!db) {
      throw new Error("syncTransaction(): db not ready");
    }
    const { transactions } = getState();
    let foundTransaction = false;

    for (const txIt of transactions) {
      if (txIt.paymentRequest === tx.paymentRequest) {
        await updateTransaction(db, { ...tx, id: txIt.id });
        actions.updateTransaction({ transaction: tx });
        foundTransaction = true;
      }
    }

    if (!foundTransaction) {
      const id = await createTransaction(db, tx);
      await actions.addTransaction({ ...tx, id });
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
    const db = getStoreState().db;
    if (!db) {
      throw new Error("getTransactions(): db not ready");
    }

    const transactions = await getTransactions(db);
    actions.setTransactions(transactions);
  }),

  /**
   * On app start, check if any invoices have
   * been settled while we were away.
   */
  checkOpenTransactions: thunk(async (actions, _, { getState, getStoreState, injections }) => {
    const { lookupInvoice } = injections.lndMobile.index;
    const db = getStoreState().db;
    if (!db) {
      throw new Error("getTransactions(): db not ready");
    }

    for (const tx of getState().transactions) {
      if (tx.status === "OPEN") {
        const check = await lookupInvoice(tx.rHash);
        if ((Date.now() / 1000) > (check.creationDate.add(check.expiry).toNumber())) {
          const updated: ITransaction = {
            ...tx,
            status: "EXPIRED",
          };
          updateTransaction(db, updated);
          actions.updateTransaction({ transaction: updated });
        }
        else if (check.settled) {
          const updated: ITransaction = {
            ...tx,
            status: "SETTLED",
            value: check.amtPaidSat,
            valueMsat: check.amtPaidMsat,
          };
          updateTransaction(db, updated);
          actions.updateTransaction({ transaction: updated });
        }
      }
    }
  }),

  /**
   * Set transactions to our transaction array
   */
  setTransactions: action((state, transactions) => { state.transactions = transactions; }),

  transactions: [],
  getTransactionByRHash: computed(
    (state) => {
      return (rHash: string) => {
        return state.transactions.find((tx) => rHash === tx.rHash);
      };
    },
  ),

  getTransactionByPaymentRequest: computed(
    (state) => {
      return (paymentRequest: string) => {
        return state.transactions.find((tx) => {
          return paymentRequest === tx.paymentRequest;
        });
      };
    },
  ),
};

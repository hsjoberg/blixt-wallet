import { Thunk, thunk, Action, action } from "easy-peasy";
import { ITransaction, getTransactions } from "../storage/database/transaction";
import { IStoreModel } from "./index";

export interface ITransactionModel {
  getTransactions: Thunk<ITransactionModel, undefined, any, IStoreModel>;
  setTransactions: Action<ITransactionModel, ITransaction[]>;

  transactions: ITransaction[];
}

export const transaction: ITransactionModel = {
  getTransactions: thunk(async (actions, _, { getStoreState }) => {
    const db = getStoreState().db;
    if (!db) {
      throw new Error("getTransactions(): db not ready");
    }

    const transactions = await getTransactions(db);
    actions.setTransactions(transactions);
  }),
  setTransactions: action((state, transactions) => { state.transactions = transactions; }),

  transactions: [],
};

import { Action, action, Thunk, thunk, Computed, computed } from "easy-peasy";

import { IStoreModel } from "./index";
import { IStoreInjections } from "./store";
import { lnrpc } from "../../proto/proto";

export interface IBlixtTransaction extends lnrpc.ITransaction {
  type: "NORMAL" | "CHANNEL_OPEN" | "CHANNEL_CLOSE";
}

export interface ISetTransactionsPayload {
  transactions: IBlixtTransaction[];
}

export interface IOnChainModel {
  getBalance: Thunk<IOnChainModel>;
  getAddress: Thunk<IOnChainModel>;
  getTransactions: Thunk<IOnChainModel, void, IStoreInjections, IStoreModel>;

  setBalance: Action<IOnChainModel, lnrpc.WalletBalanceResponse>;
  setUnconfirmedBalance: Action<IOnChainModel, lnrpc.WalletBalanceResponse>;
  setAddress: Action<IOnChainModel, lnrpc.NewAddressResponse>;
  setTransactions: Action<IOnChainModel, ISetTransactionsPayload>;

  balance: number;
  unconfirmedBalance: number;
  totalBalance: Computed<IOnChainModel, number>;
  address?: string;
  transactions: lnrpc.Transaction[];
}

export const onChain: IOnChainModel = {
  getBalance: thunk(async (actions, _, { injections }) => {
    const { walletBalance } = injections.lndMobile.onchain;
    const walletBalanceResponse = await walletBalance();
    actions.setBalance(walletBalanceResponse);
    actions.setUnconfirmedBalance(walletBalanceResponse);
  }),

  getAddress: thunk(async (actions, _, { injections }) => {
    const { newAddress } = injections.lndMobile.onchain;
    const newAddressResponse = await newAddress();
    actions.setAddress(newAddressResponse);
  }),

  getTransactions: thunk(async (actions, _, { getStoreState, injections }) => {
    const { getTransactions } = injections.lndMobile.onchain;
    const channels = getStoreState().channel.channels;
    const transactionDetails = await getTransactions();

    const transactions: IBlixtTransaction[] = [];
    // TODO better method of doing this:
    for (const tx of transactionDetails.transactions) {
      let type: IBlixtTransaction["type"] = "NORMAL";

      for (const channel of channels) {
        if (tx.txHash === channel.channelPoint!.split(":")[0]) {
          type = "CHANNEL_OPEN";
        }
      }
      transactions.push({
        ...tx,
        type,
      });
    }

    actions.setTransactions({ transactions });
  }),

  setBalance: action((state, payload) => state.balance = payload.confirmedBalance),
  setUnconfirmedBalance: action((state, payload) => state.unconfirmedBalance = payload.unconfirmedBalance),
  setAddress: action((state, payload) => state.address = payload.address),
  setTransactions: action((state, payload) => state.transactions = payload.transactions),

  balance: 0,
  unconfirmedBalance: 0,
  totalBalance: computed((state) => state.balance + state.unconfirmedBalance),
  transactions: [],
};

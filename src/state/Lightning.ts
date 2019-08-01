import { NativeModules, DeviceEventEmitter, ToastAndroid } from "react-native";
import { Action, action, Thunk, thunk } from "easy-peasy";
import {
  getInfo,
  unlockWallet,
  channelBalance,
  sendPaymentSync,
  decodePayReq,
  addInvoice,
} from "../lndmobile/index";
import { IStoreModel } from "./index";
import { ITransaction } from "../storage/database/transaction";
import { lnrpc } from "../../proto/proto";
import { subscribeInvoices, decodeInvoiceResult } from "../lndmobile/wallet";
import { decodeStreamResult } from "../lndmobile/utils";

const { LndMobile } = NativeModules;

interface ILightningModelSendPaymentPayload {
  paymentRequest: string;
  invoiceInfo: lnrpc.PayReq;
}

interface ILightningModAddInvoicePayload {
  description: string;
  sat: number;
  expiry?: number;
}

const timeout = (time: number) => new Promise((resolve) => setTimeout(() => resolve(), time));

export interface ILightningModel {
  initialize: Thunk<ILightningModel, undefined, any, IStoreModel>;

  unlockWallet: Thunk<ILightningModel>;
  getInfo: Thunk<ILightningModel, undefined>;
  sendPayment: Thunk<ILightningModel, ILightningModelSendPaymentPayload, any, IStoreModel, Promise<lnrpc.SendResponse>>;

  setNodeInfo: Action<ILightningModel, lnrpc.IGetInfoResponse>;
  setReady: Action<ILightningModel, boolean>;
  setFirstSync: Action<ILightningModel, boolean>;

  getBalance: Thunk<ILightningModel, undefined>;
  setBalance: Action<ILightningModel, number>;

  decodePaymentRequest: Thunk<ILightningModel, { bolt11: string }, any, any, Promise<lnrpc.PayReq>>;
  addInvoice: Thunk<ILightningModel, ILightningModAddInvoicePayload, any, IStoreModel, Promise<lnrpc.AddInvoiceResponse>>;

  subscribeInvoice: Thunk<ILightningModel, undefined, any, IStoreModel>;
  setInvoiceSubscriptionStarted: Action<ILightningModel, boolean>;
  subscribeChannelUpdates: Thunk<ILightningModel>;

  nodeInfo?: lnrpc.IGetInfoResponse;
  balance: number;
  invoiceSubscriptionStarted: boolean;
  syncedToChain: boolean;
  ready: boolean;
  firstSync: boolean;
}

export const lightning: ILightningModel = {
  initialize: thunk(async (actions, _, { getState, dispatch }) => {
    const start = new Date().getTime();

    const status = await NativeModules.LndMobile.checkStatus();
    if ((status & LndMobile.STATUS_WALLET_UNLOCKED) !== LndMobile.STATUS_WALLET_UNLOCKED) {
      console.log("Wallet not unlocked, unlocking");
      await actions.unlockWallet(undefined);
    }
    console.log("lnd: time to start and unlock: " + (new Date().getTime() - start) + "ms");
    await actions.getInfo(undefined);
    await actions.getBalance(undefined);
    await subscribeInvoices();
    await dispatch.transaction.getTransactions(undefined);
    await dispatch.channel.getChannels(undefined);

    if (!(getState().invoiceSubscriptionStarted)) {
      actions.subscribeInvoice(undefined);
    }

    dispatch.channel.initialize(undefined);

    actions.setReady(true);

    console.log("lnd startup time: " + (new Date().getTime() - start) + "ms");
    ToastAndroid.show("lnd startup time: " + (new Date().getTime() - start) + "ms", ToastAndroid.SHORT);

    return true;
  }),

  unlockWallet: thunk(async () => {
    let unlockWalletDone = false;
    do {
      try {
        console.log("try unlockWallet");
        await unlockWallet("test1234");
        unlockWalletDone = true;
      }
      catch (e) {
        console.log(e);
        console.log(typeof e);
        ToastAndroid.show(e, ToastAndroid.LONG);
        await timeout(3000);
      }
    } while (!unlockWalletDone);
    console.log("Wallet unlocked");
  }),

  getInfo: thunk(async (actions, _, { getState }) => {
    const firstSync = getState().firstSync;
    let info;
    do {
      console.log("getInfo");
      info = await getInfo();
      console.log("blockHeight", info.blockHeight);
      console.log("syncedToChain", info.syncedToChain);
      actions.setNodeInfo(info);

      if (info.syncedToChain !== true) {
        await timeout(firstSync ? 6000 : 600);
      }
      else {
        console.log(info);
      }
    } while (!info.syncedToChain);
  }),

  setNodeInfo: action((state, payload) => {
    state.nodeInfo = payload;
  }),

  setReady: action((state, payload) => {
    state.ready = payload;
  }),

  setFirstSync: action((state, payload) => {
    state.firstSync = payload;
  }),

  getBalance: thunk(async (actions) => {
    const response = await channelBalance();
    actions.setBalance(response.balance);
  }),
  setBalance: action((state, payload) => {
    state.balance = payload;
  }),
  setInvoiceSubscriptionStarted: action((state, payload) => {
    state.invoiceSubscriptionStarted = payload;
  }),

  sendPayment: thunk(async (_, { paymentRequest, invoiceInfo }, { dispatch }) => {
    const result = await sendPaymentSync(paymentRequest);

    if (result.paymentError && result.paymentError.length > 0) {
      throw new Error(result.paymentError);
    }

    const transaction: ITransaction = {
      date: invoiceInfo.timestamp,
      description: invoiceInfo.description,
      expire: invoiceInfo.expiry,
      paymentRequest,
      remotePubkey: invoiceInfo.destination,
      rHash: invoiceInfo.paymentHash,
      status: "SETTLED",
      value: -invoiceInfo.numSatoshis,
      valueMsat: -(invoiceInfo.numSatoshis * 1000),
      fee: result.paymentRoute!.totalFees! || 0,
      feeMsat: result.paymentRoute!.totalFeesMsat! || 0,
    };
    console.log("ITransaction", transaction);
    await dispatch.transaction.syncTransaction(transaction);
    return result;
  }),

  addInvoice: thunk(async (_, { description, sat, expiry }) => {
    const result = await addInvoice(sat, description, expiry);
    return result;
  }),

  decodePaymentRequest: thunk(async (_, payload) => {
    const result = await decodePayReq(payload.bolt11);
    return result;
  }),

  subscribeInvoice: thunk((_, _2, { getState, dispatch }) => {
    if (getState().invoiceSubscriptionStarted) {
      console.log("WARNING: Lightning.subscribeInvoice() called when subsription already started");
      return;
    }
    console.log("Starting transaction subscription");
    DeviceEventEmitter.addListener("SubscribeInvoices", async (e: any) => {
      console.log("New invoice event");
      console.log(e);

      const invoice = decodeInvoiceResult(e.data);
      const bolt11 = await decodePayReq(invoice.paymentRequest);

      // TODO in the future we should handle
      // both value (the requested amount in the payreq)
      // and amtPaidMsat (the actual amount paid)
      const transaction: ITransaction = {
        description: invoice.memo,
        value: (invoice as any).value,
        valueMsat: (invoice as any).value * 1000,
        date: (invoice as any).creationDate,
        expire: (invoice as any).creationDate + bolt11.expiry,
        remotePubkey: (bolt11 as any).destination,
        status: decodeInvoiceState(invoice.state),
        paymentRequest: invoice.paymentRequest,
        rHash: bolt11.paymentHash,
      };
      await dispatch.transaction.syncTransaction(transaction);
    });
  }),

  subscribeChannelUpdates: thunk((actions, _, { getState, dispatch }) => {
    DeviceEventEmitter.addListener("channel", async (e: any) => {
      console.log("New channel event");
      console.log(e);
    });
  }),

  balance: 0,
  invoiceSubscriptionStarted: false,
  syncedToChain: false,
  ready: false,
  firstSync: false,
};


// https://stackoverflow.com/questions/34309988/byte-array-to-hex-string-conversion-in-javascript
function toHexString(byteArray: number[]) {
  return Array.from(byteArray, function(byte) {
    return ("0" + (byte & 0xFF).toString(16)).slice(-2);
  }).join("")
}

function decodeInvoiceState(invoiceState: lnrpc.Invoice.InvoiceState) {
  switch (invoiceState) {
    case lnrpc.Invoice.InvoiceState.ACCEPTED: return "ACCEPTED";
    case lnrpc.Invoice.InvoiceState.CANCELED: return "CANCELED";
    case lnrpc.Invoice.InvoiceState.OPEN: return "OPEN";
    case lnrpc.Invoice.InvoiceState.SETTLED: return "SETTLED";
    default: return "UNKNOWN";
  }
}

import { Action, action, Thunk, thunk } from "easy-peasy";

import { decodePayReq, addInvoice } from "../lndmobile/index";
import { IStoreModel } from "./index";
import { lnrpc } from "../../proto/proto";
import { ITransaction } from "../storage/database/transaction";
import { DeviceEventEmitter } from "react-native";
import { decodeInvoiceResult, subscribeInvoices } from "../lndmobile/wallet";

interface IReceiveModelAddInvoicePayload {
  description: string;
  sat: number;
  expiry?: number;
}

export interface IReceiveModel {
  initialize: Thunk<IReceiveModel>;

  addInvoice: Thunk<IReceiveModel, IReceiveModelAddInvoicePayload, any, IStoreModel, Promise<lnrpc.AddInvoiceResponse>>;
  subscribeInvoice: Thunk<IReceiveModel, undefined, any, IStoreModel>;
  setInvoiceSubscriptionStarted: Action<IReceiveModel, boolean>;

  invoiceSubscriptionStarted: boolean;
}

export const receive: IReceiveModel = {
  initialize: thunk(async (actions, _, { getState }) => {
    await subscribeInvoices();

    if (!(getState().invoiceSubscriptionStarted)) {
      actions.subscribeInvoice(undefined);
    }
  }),

  addInvoice: thunk(async (_, { description, sat, expiry }) => {
    const result = await addInvoice(sat, description, expiry);
    return result;
  }),

  subscribeInvoice: thunk((_, _2, { getState, dispatch }) => {
    if (getState().invoiceSubscriptionStarted) {
      console.log("WARNING: Receive.subscribeInvoice() called when subsription already started");
      return;
    }
    console.log("Starting transaction subscription");
    DeviceEventEmitter.addListener("SubscribeInvoices", async (e: any) => {
      console.log("New invoice event");
      console.log(e);

      const invoice = decodeInvoiceResult(e.data);
      const paymentRequest = await decodePayReq(invoice.paymentRequest);

      // TODO in the future we should handle
      // both value (the requested amount in the payreq)
      // and amtPaidMsat (the actual amount paid)
      const transaction: ITransaction = {
        description: invoice.memo,
        value: (invoice as any).value,
        valueMsat: (invoice as any).value * 1000,
        fee: null,
        feeMsat: null,
        date: (invoice as any).creationDate,
        expire: (invoice as any).creationDate + paymentRequest.expiry,
        remotePubkey: (paymentRequest as any).destination,
        status: decodeInvoiceState(invoice.state),
        paymentRequest: invoice.paymentRequest,
        rHash: paymentRequest.paymentHash,
        nodeAliasCached: null,
        hops: [],
      };
      await dispatch.transaction.syncTransaction(transaction);
    });
  }),

  setInvoiceSubscriptionStarted: action((state, payload) => { state.invoiceSubscriptionStarted = payload }),

  invoiceSubscriptionStarted: false,
};

function decodeInvoiceState(invoiceState: lnrpc.Invoice.InvoiceState) {
  switch (invoiceState) {
    case lnrpc.Invoice.InvoiceState.ACCEPTED: return "ACCEPTED";
    case lnrpc.Invoice.InvoiceState.CANCELED: return "CANCELED";
    case lnrpc.Invoice.InvoiceState.OPEN: return "OPEN";
    case lnrpc.Invoice.InvoiceState.SETTLED: return "SETTLED";
    default: return "UNKNOWN";
  }
}

import { Action, action, Thunk, thunk } from "easy-peasy";
import { DeviceEventEmitter } from "react-native";
import Long from "long";

import { IStoreModel } from "./index";
import { IStoreInjections } from "./store";
import { ITransaction } from "../storage/database/transaction";
import { lnrpc } from "../../proto/proto";

interface IReceiveModelAddInvoicePayload {
  description: string;
  sat: number;
  expiry?: number;
}

export interface IReceiveModel {
  initialize: Thunk<IReceiveModel, undefined, IStoreInjections>;

  addInvoice: Thunk<IReceiveModel, IReceiveModelAddInvoicePayload, IStoreInjections, IStoreModel, Promise<lnrpc.AddInvoiceResponse>>;
  subscribeInvoice: Thunk<IReceiveModel, undefined, IStoreInjections, IStoreModel>;
  setInvoiceSubscriptionStarted: Action<IReceiveModel, boolean>;

  invoiceSubscriptionStarted: boolean;
}

export const receive: IReceiveModel = {
  initialize: thunk(async (actions, _, { getState, injections }) => {
    const { subscribeInvoices } = injections.lndMobile.wallet;
    await subscribeInvoices();

    if (!(getState().invoiceSubscriptionStarted)) {
      actions.subscribeInvoice(undefined);
    }
  }),

  addInvoice: thunk(async (_, { description, sat, expiry }, { injections }) => {
    const { addInvoice } = injections.lndMobile.index;
    const result = await addInvoice(sat, description, expiry);
    return result;
  }),

  subscribeInvoice: thunk((actions, _2, { getState, dispatch, injections }) => {
    const { decodePayReq } = injections.lndMobile.index;
    const { decodeInvoiceResult } = injections.lndMobile.wallet;
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
        value: invoice.value || Long.fromInt(0),
        valueMsat: (invoice.value && invoice.value.mul(1000)) || Long.fromInt(0),
        fee: null,
        feeMsat: null,
        date: invoice.creationDate,
        expire: invoice.creationDate.add(paymentRequest.expiry),
        remotePubkey: paymentRequest.destination,
        status: decodeInvoiceState(invoice.state),
        paymentRequest: invoice.paymentRequest,
        rHash: paymentRequest.paymentHash,
        nodeAliasCached: null,
        hops: [],
      };
      await dispatch.transaction.syncTransaction(transaction);
    });
    actions.setInvoiceSubscriptionStarted(true);
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

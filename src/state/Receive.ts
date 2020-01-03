import { Action, action, Thunk, thunk } from "easy-peasy";
import { DeviceEventEmitter } from "react-native";
import Long from "long";

import { IStoreModel } from "./index";
import { IStoreInjections } from "./store";
import { ITransaction } from "../storage/database/transaction";
import { lnrpc } from "../../proto/proto";
import { setupDescription } from "../utils/NameDesc";
import { valueFiat } from "../utils/bitcoin-units";

interface IReceiveModelAddInvoicePayload {
  description: string;
  sat: number;
  expiry?: number;
  payer: string;
}

export interface IReceiveModel {
  initialize: Thunk<IReceiveModel, undefined, IStoreInjections>;

  addInvoice: Thunk<IReceiveModel, IReceiveModelAddInvoicePayload, IStoreInjections, IStoreModel, Promise<lnrpc.AddInvoiceResponse>>;
  subscribeInvoice: Thunk<IReceiveModel, undefined, IStoreInjections, IStoreModel>;
  setInvoiceSubscriptionStarted: Action<IReceiveModel, boolean>;
  setPayerTmp: Action<IReceiveModel, string | null>;

  invoiceSubscriptionStarted: boolean;
  payerTmp: string | null;
}

export const receive: IReceiveModel = {
  initialize: thunk(async (actions, _, { getState, injections }) => {
    const { subscribeInvoices } = injections.lndMobile.wallet;
    await subscribeInvoices();

    if (!(getState().invoiceSubscriptionStarted)) {
      actions.subscribeInvoice(undefined);
    }
    return true;
  }),

  addInvoice: thunk(async (actions, { description, sat, expiry, payer }, { injections, getStoreState }) => {
    console.log("invoice test create")
    const { addInvoice } = injections.lndMobile.index;
    const name = getStoreState().settings.name;
    description = setupDescription(description, name);

    if (payer && payer.length > 0) {
      actions.setPayerTmp(payer);
    }

    const result = await addInvoice(sat, description, expiry);
    console.log("result");
    return result;
  }),

  subscribeInvoice: thunk((actions, _2, { getState, dispatch, injections, getStoreState }) => {
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

      const payer = getState().payerTmp;
      actions.setPayerTmp(null);

      // TODO in the future we should handle
      // both value (the requested amount in the payreq)
      // and amtPaidMsat (the actual amount paid)

      if (invoice.value ?? !invoice.value.toNumber) {
        invoice.value = Long.fromValue(invoice.value);
      }
      if (invoice.amtPaidSat ?? !invoice.amtPaidSat.toNumber) {
        invoice.amtPaidSat = Long.fromValue(invoice.amtPaidSat);
      }
      if (invoice.amtPaidMsat ?? !invoice.amtPaidMsat.toNumber) {
        invoice.amtPaidMsat = Long.fromValue(invoice.amtPaidMsat);
      }

      let transaction: ITransaction = {
        description: invoice.memo,
        value: invoice.value || Long.fromInt(0),
        valueMsat: (invoice.value && invoice.value.mul(1000)) || Long.fromInt(0),
        amtPaidSat: invoice.amtPaidSat,
        amtPaidMsat: invoice.amtPaidMsat,
        fee: null,
        feeMsat: null,
        date: invoice.creationDate,
        expire: invoice.creationDate.add(paymentRequest.expiry),
        remotePubkey: paymentRequest.destination,
        status: decodeInvoiceState(invoice.state),
        paymentRequest: invoice.paymentRequest,
        rHash: paymentRequest.paymentHash,
        nodeAliasCached: null,
        valueUSD: null,
        valueFiat: null,
        valueFiatCurrency: null,
        hops: [],
      };
      if (payer) {
        transaction.payer = payer;
      }
      if (invoice.state === lnrpc.Invoice.InvoiceState.SETTLED) {
        transaction.valueUSD = valueFiat(invoice.amtPaidSat, getStoreState().fiat.fiatRates.USD.last);
        transaction.valueFiat = valueFiat(invoice.amtPaidSat, getStoreState().fiat.currentRate);
        transaction.valueFiatCurrency = getStoreState().settings.fiatUnit;
      }
      await dispatch.transaction.syncTransaction(transaction);
    });
    actions.setInvoiceSubscriptionStarted(true);
  }),

  setInvoiceSubscriptionStarted: action((state, payload) => { state.invoiceSubscriptionStarted = payload }),
  setPayerTmp: action((state, payload) => { state.payerTmp = payload }),

  invoiceSubscriptionStarted: false,
  payerTmp: null,
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

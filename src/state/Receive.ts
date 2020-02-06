import { Action, action, Thunk, thunk } from "easy-peasy";
import { DeviceEventEmitter } from "react-native";
import Long from "long";

import { IStoreModel } from "./index";
import { IStoreInjections } from "./store";
import { ITransaction } from "../storage/database/transaction";
import { lnrpc } from "../../proto/proto";
import { Reader } from "protobufjs";
import { setupDescription } from "../utils/NameDesc";
import { valueFiat } from "../utils/bitcoin-units";
import { timeout, uint8ArrayToString, bytesToString } from "../utils";
import { TLV_RECORD_NAME } from "../utils/constants.ts";

interface IReceiveModelAddInvoicePayload {
  description: string;
  sat: number;
  expiry?: number;
  payer: string;
}

export interface IReceiveModel {
  initialize: Thunk<IReceiveModel, void, IStoreInjections>;

  addInvoice: Thunk<IReceiveModel, IReceiveModelAddInvoicePayload, IStoreInjections, IStoreModel, Promise<lnrpc.AddInvoiceResponse>>;
  subscribeInvoice: Thunk<IReceiveModel, void, IStoreInjections, IStoreModel>;
  setInvoiceSubscriptionStarted: Action<IReceiveModel, boolean>;
  setPayerTmp: Action<IReceiveModel, string | null>;

  invoiceSubscriptionStarted: boolean;
  payerTmp: string | null;
}

export const receive: IReceiveModel = {
  initialize: thunk(async (actions, _, { injections }) => {
    const subscribeInvoices = injections.lndMobile.wallet.subscribeInvoices;
    await subscribeInvoices();
    await timeout(2000); // Wait for the stream to get ready
    actions.subscribeInvoice();
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
    console.log("result", result);
    return result;
  }),

  subscribeInvoice: thunk((actions, _2, { getState, dispatch, injections, getStoreState }) => {
    const decodePayReq = injections.lndMobile.index.decodePayReq;
    const decodeInvoiceResult = injections.lndMobile.wallet.decodeInvoiceResult;
    if (getState().invoiceSubscriptionStarted) {
      console.log("WARNING: Receive.subscribeInvoice() called when subsription already started");
      return;
    }
    DeviceEventEmitter.addListener("SubscribeInvoices", async (e: any) => {
      console.log("New invoice event");

      const invoice = decodeInvoiceResult(e.data);
      console.log(invoice);
      const paymentRequest = await decodePayReq(invoice.paymentRequest);

      const payer = getState().payerTmp;
      actions.setPayerTmp(null);

      // TODO in the future we should handle
      // both value (the requested amount in the payreq)
      // and amtPaidMsat (the actual amount paid)

      if (!Long.isLong(invoice.value)) {
        invoice.value = Long.fromValue(invoice.value);
      }
      if (!Long.isLong(invoice.valueMsat)) {
        invoice.amtPaidSat = Long.fromValue(invoice.amtPaidSat);
      }
      if (!Long.isLong(invoice.amtPaidMsat)) {
        invoice.amtPaidMsat = Long.fromValue(invoice.amtPaidMsat);
      }

      const transaction: ITransaction = {
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
        tlvRecordName: null,
        hops: [],
      };
      if (payer) {
        transaction.payer = payer;
      }
      if (invoice.state === lnrpc.Invoice.InvoiceState.SETTLED) {
        transaction.valueUSD = valueFiat(invoice.amtPaidSat, getStoreState().fiat.fiatRates.USD.last);
        transaction.valueFiat = valueFiat(invoice.amtPaidSat, getStoreState().fiat.currentRate);
        transaction.valueFiatCurrency = getStoreState().settings.fiatUnit;

        // Loop through known TLV records
        for (const htlc of invoice.htlcs) {
          console.log(htlc.state);
          if (htlc.customRecords) {
            console.log(htlc.customRecords);

            const tlvRecordNameKey = Object.keys(lnrpc.InvoiceHTLC.decode(lnrpc.InvoiceHTLC.encode({
              customRecords: { [TLV_RECORD_NAME]: new Uint8Array([0]) }
            }).finish()).customRecords)[0];

            if (htlc.customRecords[tlvRecordNameKey]) {
              const tlvRecordName = uint8ArrayToString(htlc.customRecords[tlvRecordNameKey]);
              console.log("Found TLV_RECORD_NAME 🎉", tlvRecordName);
              transaction.tlvRecordName = tlvRecordName;
            }
          }
        }
      }
      await dispatch.transaction.syncTransaction(transaction);
    });
    actions.setInvoiceSubscriptionStarted(true);
    console.log("Transaction subscription started");
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

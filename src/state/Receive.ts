import { Action, action, Thunk, thunk } from "easy-peasy";
import { DeviceEventEmitter, EmitterSubscription } from "react-native";
import Long from "long";

import { IStoreModel } from "./index";
import { IStoreInjections } from "./store";
import { ITransaction } from "../storage/database/transaction";
import { lnrpc } from "../../proto/proto";
import { setupDescription } from "../utils/NameDesc";
import { valueFiat, formatBitcoin } from "../utils/bitcoin-units";
import { timeout, uint8ArrayToString, bytesToString, decodeTLVRecord, stringToUint8Array, bytesToHexString, toast, hexToUint8Array } from "../utils";
import { TLV_RECORD_NAME } from "../utils/constants";

import logger from "./../utils/log";
import { localNotification } from "../utils/push-notification";
const log = logger("Receive");

// TODO(hsjoberg): this should match Transaction model
interface IInvoiceTempData {
  rHash?: string;
  payer: string | null;
  type: ITransaction["type"];
  website: string | null;
}

interface IReceiveModelAddInvoicePayload {
  description: string;
  sat: number;
  expiry?: number;
  tmpData?: IInvoiceTempData;
}

export interface IReceiveModel {
  initialize: Thunk<IReceiveModel, void, IStoreInjections>;
  deinitialize: Thunk<IReceiveModel>;

  addInvoice: Thunk<IReceiveModel, IReceiveModelAddInvoicePayload, IStoreInjections, IStoreModel, Promise<lnrpc.AddInvoiceResponse>>;
  subscribeInvoice: Thunk<IReceiveModel, void, IStoreInjections, IStoreModel>;
  setInvoiceSubscriptionStarted: Action<IReceiveModel, boolean>;
  setInvoiceSubscriptionResource: Action<IReceiveModel, EmitterSubscription | undefined>;

  setInvoiceTmpData: Action<IReceiveModel, IInvoiceTempData>;
  deleteInvoiceTmpData: Action<IReceiveModel, string>;

  invoiceSubscriptionStarted: boolean; // TODO make computed value
  invoiceSubscription?: EmitterSubscription;
  invoiceTempData: { [key: string]: IInvoiceTempData };
}

export const receive: IReceiveModel = {
  initialize: thunk(async (actions, _, { injections }) => {
    const subscribeInvoices = injections.lndMobile.wallet.subscribeInvoices;
    await subscribeInvoices();
    await timeout(2000); // Wait for the stream to get ready
    actions.subscribeInvoice();
    return true;
  }),

  deinitialize: thunk((actions, _, { getState }) => {
    const invoiceSubscription = getState().invoiceSubscription;
    if (invoiceSubscription) {
      log.i("Removing invoice subscription");
      invoiceSubscription.remove();
      actions.setInvoiceSubscriptionStarted(false);
      actions.setInvoiceSubscriptionResource(undefined);
    }
  }),

  addInvoice: thunk(async (actions, payload, { injections, getStoreState }) => {
    log.d("addInvoice()");
    const addInvoice = injections.lndMobile.index.addInvoice;
    const name = getStoreState().settings.name;
    const description = setupDescription(payload.description, name);

    const result = await addInvoice(payload.sat, description, payload.expiry);

    if (payload.tmpData) {
      actions.setInvoiceTmpData({
        ...payload.tmpData,
        rHash: bytesToHexString(result.rHash),
      });
    }
    log.d("addInvoice() result", [result]);
    return result;
  }),

  subscribeInvoice: thunk((actions, _2, { getState, dispatch, injections, getStoreState }) => {
    const decodePayReq = injections.lndMobile.index.decodePayReq;
    const decodeInvoiceResult = injections.lndMobile.wallet.decodeInvoiceResult;
    if (getState().invoiceSubscriptionStarted) {
      log.d("Receive.subscribeInvoice() called when subsription already started");
      return;
    }
    const invoiceSubscription = DeviceEventEmitter.addListener("SubscribeInvoices", async (e: any) => {
      try {
        log.i("New invoice event");

        const invoice = decodeInvoiceResult(e.data);
        const rHash = bytesToHexString(invoice.rHash);

        log.d("invoice", [invoice]);
        const paymentRequest = invoice.paymentRequest
          ? await decodePayReq(invoice.paymentRequest)
          : undefined;

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

        const tmpData: IInvoiceTempData = getState().invoiceTempData[rHash] ?? {
          rHash,
          payer: null,
          type: "NORMAL",
          website: null,
        };

        const transaction: ITransaction = {
          description: invoice.memo,
          value: invoice.value ?? Long.fromInt(0),
          valueMsat: invoice.value.mul(1000) ?? Long.fromInt(0),
          amtPaidSat: invoice.amtPaidSat,
          amtPaidMsat: invoice.amtPaidMsat,
          fee: null,
          feeMsat: null,
          date: invoice.creationDate,
          expire: paymentRequest ? invoice.creationDate.add(paymentRequest.expiry) : Long.fromNumber(0),
          remotePubkey: paymentRequest ? paymentRequest.destination : "", // TODO
          status: decodeInvoiceState(invoice.state),
          paymentRequest: invoice.paymentRequest,
          rHash,
          nodeAliasCached: null,
          valueUSD: null,
          valueFiat: null,
          valueFiatCurrency: null,
          tlvRecordName: null,

          payer: tmpData.payer,
          website: tmpData.website,
          type: tmpData.type,
          locationLat: null,
          locationLong: null,

          preimage: invoice.rPreimage,
          lnurlPayResponse: null,

          hops: [],
        };

        if (invoice.state === lnrpc.Invoice.InvoiceState.SETTLED) {
          const fiatUnit = getStoreState().settings.fiatUnit;
          const valFiat = valueFiat(invoice.amtPaidSat, getStoreState().fiat.currentRate);

          transaction.valueUSD = valueFiat(invoice.amtPaidSat, getStoreState().fiat.fiatRates.USD.last);
          transaction.valueFiat = valFiat;
          transaction.valueFiatCurrency = fiatUnit;

          // Loop through known TLV records
          for (const htlc of invoice.htlcs) {
            if (htlc.customRecords) {
              for (const [customRecordKey, customRecordValue] of Object.entries(htlc.customRecords)) {
                if (decodeTLVRecord(customRecordKey) === TLV_RECORD_NAME) {
                  const tlvRecordName = uint8ArrayToString(customRecordValue);
                  log.i("Found TLV_RECORD_NAME 🎉", [tlvRecordName]);
                  transaction.tlvRecordName = tlvRecordName;
                }
              }
            }
          }

          const bitcoinUnit = getStoreState().settings.bitcoinUnit;
          let message = `Received ${formatBitcoin(invoice.amtPaidSat, bitcoinUnit)} (${valFiat.toFixed(2)} ${fiatUnit})`;
          if (transaction.tlvRecordName ?? transaction.payer ?? transaction.website) {
            message += ` from ${transaction.tlvRecordName ?? transaction.payer ?? transaction.website}`;
          }
          localNotification(message, "high");

          // We can now delete the temp data
          // as the invoice has been settled
          actions.deleteInvoiceTmpData(rHash);
        }

        setTimeout(async () => {
          await dispatch.channel.getBalance();
          await dispatch.fiat.getRate();
        }, 500);
        await dispatch.transaction.syncTransaction(transaction);
      } catch (e) {
        console.error(e)
        log.i("Error receiving invoice", [e]);
        toast("Error receiving payment: " + e.message, undefined, "danger");
      }
    });
    actions.setInvoiceSubscriptionStarted(true);
    actions.setInvoiceSubscriptionResource(invoiceSubscription);
    log.i("Transaction subscription started");
  }),

  setInvoiceSubscriptionStarted: action((state, payload) => { state.invoiceSubscriptionStarted = payload }),

  setInvoiceSubscriptionResource: action((state, payload) => { state.invoiceSubscription = payload }),

  setInvoiceTmpData: action((state, payload) => {
    state.invoiceTempData = {
      ...state.invoiceTempData,
      [payload.rHash!]: payload,
    }
  }),

  deleteInvoiceTmpData: action((state, payload) => {
    const tmpData = { ...state.invoiceTempData };
    delete tmpData[payload];
    state.invoiceTempData = tmpData;
  }),

  invoiceSubscriptionStarted: false,
  invoiceTempData: {},
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

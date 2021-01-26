import { Action, action, Thunk, thunk } from "easy-peasy";
import { DeviceEventEmitter, EmitterSubscription } from "react-native";
import Long from "long";

import { IStoreModel } from "./index";
import { IStoreInjections } from "./store";
import { ITransaction } from "../storage/database/transaction";
import { lnrpc, invoicesrpc } from "../../proto/proto";
import { setupDescription } from "../utils/NameDesc";
import { valueFiat, formatBitcoin } from "../utils/bitcoin-units";
import { timeout, uint8ArrayToString, decodeTLVRecord, bytesToHexString, toast } from "../utils";
import { TLV_RECORD_NAME } from "../utils/constants";
import { identifyService } from "../utils/lightning-services";
import { LndMobileEventEmitter } from "../utils/event-listener";

import logger from "./../utils/log";
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

interface IReceiveModelAddInvoiceBlixtLspPayload {
  description: string;
  sat: number;
  expiry?: number;
  tmpData?: IInvoiceTempData;

  preimage: Uint8Array;
  chanId: string;
  cltvExpiryDelta: number;
  feeBaseMsat: number;
  feeProportionalMillionths: number;
  servicePubkey: string;
}

interface IReceiveModelCancelInvoicePayload {
  rHash: string;
}

export interface IReceiveModel {
  initialize: Thunk<IReceiveModel, void, IStoreInjections>;
  deinitialize: Thunk<IReceiveModel>;

  addInvoice: Thunk<IReceiveModel, IReceiveModelAddInvoicePayload, IStoreInjections, IStoreModel, Promise<lnrpc.AddInvoiceResponse>>;
  addInvoiceBlixtLsp: Thunk<IReceiveModel, IReceiveModelAddInvoiceBlixtLspPayload, IStoreInjections, IStoreModel, Promise<lnrpc.AddInvoiceResponse>>;
  cancelInvoice: Thunk<IReceiveModel, IReceiveModelCancelInvoicePayload, IStoreInjections, Promise<invoicesrpc.CancelInvoiceResp>>;
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
  initialize: thunk(async (actions, _, { getState, injections }) => {
    if (getState().invoiceSubscriptionStarted) {
      log.w("Receive.initialize() called when subscription already started");
      return;
    }
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

  addInvoice: thunk(async (actions, payload, { injections, getStoreState, getStoreActions }) => {
    log.d("addInvoice()");
    const addInvoice = injections.lndMobile.index.addInvoice;
    const name = getStoreState().settings.name;
    const description = setupDescription(payload.description, name);

    const result = await addInvoice(payload.sat, description, payload.expiry);
    log.d("addInvoice() result", [result]);
    getStoreActions().clipboardManager.addToInvoiceCache(result.paymentRequest);

    if (payload.tmpData) {
      actions.setInvoiceTmpData({
        ...payload.tmpData,
        rHash: bytesToHexString(result.rHash),
      });
    }

    return result;
  }),

  addInvoiceBlixtLsp: thunk(async (actions, payload, { injections, getStoreState, getStoreActions }) => {
    log.d("addInvoice()");
    const addInvoiceBlixtLsp = injections.lndMobile.index.addInvoiceBlixtLsp;
    const name = getStoreState().settings.name;
    const description = setupDescription(payload.description, name);

    const result = await addInvoiceBlixtLsp({
      amount: payload.sat,
      preimage: payload.preimage,
      chanId: payload.chanId,
      cltvExpiryDelta: payload.cltvExpiryDelta,
      feeBaseMsat: payload.feeBaseMsat,
      feeProportionalMillionths: payload.feeProportionalMillionths,
      memo: description,
      servicePubkey: payload.servicePubkey,
    });

    // (payload.sat, description, payload.expiry);
    log.d("addInvoice() result", [result]);
    getStoreActions().clipboardManager.addToInvoiceCache(result.paymentRequest);

    payload.tmpData = payload.tmpData ?? {
      type: "DUNDER_ONDEMANDCHANNEL",
      payer: null,
      website: null,
    }

    if (payload.tmpData) {
      actions.setInvoiceTmpData({
        ...payload.tmpData,
        rHash: bytesToHexString(result.rHash),
        type: "DUNDER_ONDEMANDCHANNEL",
      });
    }

    return result;
  }),

  cancelInvoice: thunk(async (_, payload, { injections }) => {
    const cancelInvoice = injections.lndMobile.index.cancelInvoice;
    return await cancelInvoice(payload.rHash);
  }),

  subscribeInvoice: thunk((actions, _2, { getState, dispatch, injections, getStoreState, getStoreActions }) => {
    const decodePayReq = injections.lndMobile.index.decodePayReq;
    const decodeInvoiceResult = injections.lndMobile.wallet.decodeInvoiceResult;
    if (getState().invoiceSubscriptionStarted) {
      log.d("Receive.subscribeInvoice() called when subsription already started");
      return;
    }
    const invoiceSubscription = LndMobileEventEmitter.addListener("SubscribeInvoices", async (e: any) => {
      try {
        log.i("New invoice event");
        if (e.data === "") {
          log.i("Got e.data empty from SubscribeInvoices. Skipping invoice");
          return;
        }

        const invoice = decodeInvoiceResult(e.data);

        const rHash = bytesToHexString(invoice.rHash);
        log.d("invoice", [rHash]);

        const paymentRequest = invoice.paymentRequest
          ? await decodePayReq(invoice.paymentRequest)
          : undefined;

        if (invoice.isKeysend) {
          if (invoice.state !== lnrpc.Invoice.InvoiceState.SETTLED) {
            log.i("Found keysend payment, but waiting for invoice state SETTLED");
            return;
          }
        }

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
          description: invoice.memo || (invoice.isKeysend ? "Keysend payment" : ""),
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
          identifiedService: identifyService(null, "", tmpData.website),

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
          getStoreActions().notificationManager.localNotification({ message, importance: "high" });

          // We can now delete the temp data
          // as the invoice has been settled
          actions.deleteInvoiceTmpData(rHash);
        }

        if (
          transaction.payer === "Hampus Sjöberg" || transaction.payer === "Hampus Sjoberg" ||
          transaction.tlvRecordName === "Hampus Sjöberg" || transaction.tlvRecordName === "Hampus Sjoberg"
        ) {
          transaction.identifiedService = "hampus";
        }

        setTimeout(async () => {
          await dispatch.channel.getBalance();
          await dispatch.fiat.getRate();
        }, 500);
        await dispatch.transaction.syncTransaction(transaction);
      } catch (e) {
        log.e("Error receiving invoice", [e]);
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

import { EmitterSubscription } from "react-native";
import { Action, action, Thunk, thunk } from "easy-peasy";
import Long from "long";

import { IStoreModel } from "./index";
import { IStoreInjections } from "./store";
import { ITransaction } from "../storage/database/transaction";
import { setupDescription } from "../utils/NameDesc";
import { valueFiat, formatBitcoin } from "../utils/bitcoin-units";
import {
  timeout,
  decodeTLVRecord,
  bytesToHexString,
  toast,
  uint8ArrayToUnicodeString,
  hexToUint8Array,
} from "../utils";
import { TLV_RECORD_NAME, TLV_SATOGRAM, TLV_WHATSAT_MESSAGE } from "../utils/constants";
import { identifyService } from "../utils/lightning-services";
import { checkLndStreamErrorResponse } from "../utils/lndmobile";
import { ILNUrlPayResponsePayerData } from "./LNURL";

import logger from "./../utils/log";
import {
  AddInvoiceResponse,
  Invoice_InvoiceState,
} from "react-native-turbo-lnd/protos/lightning_pb";
import { CancelInvoiceResp } from "react-native-turbo-lnd/protos/invoicesrpc/invoices_pb";
import {
  addInvoice,
  decodePayReq,
  invoicesCancelInvoice,
  subscribeInvoices,
} from "react-native-turbo-lnd";
const log = logger("Receive");

// TODO(hsjoberg): this should match Transaction model
interface IInvoiceTempData {
  rHash?: string;
  payer: string | null;
  type: ITransaction["type"];
  website: string | null;
  callback?: (pr: string) => void;
  lightningBox?: {
    descHash: Uint8Array;
    payerData?: ILNUrlPayResponsePayerData;
  };
}

interface IReceiveModelAddInvoicePayload {
  description: string;
  sat: number;
  expiry?: number;
  tmpData?: IInvoiceTempData;
  preimage?: Uint8Array;
  skipNameDesc?: boolean;
}

interface IReceiveModell {
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

  addInvoice: Thunk<
    IReceiveModel,
    IReceiveModelAddInvoicePayload,
    IStoreInjections,
    IStoreModel,
    Promise<AddInvoiceResponse>
  >;

  //TURBOTODO: Nitesh: Check with Hampus on
  // IReceiveModelAddInvoiceBlixtLspPayload this type def
  addInvoiceBlixtLsp: Thunk<
    IReceiveModel,
    IReceiveModelAddInvoiceBlixtLspPayload,
    IStoreInjections,
    IStoreModel,
    Promise<AddInvoiceResponse>
  >;
  cancelInvoice: Thunk<
    IReceiveModel,
    IReceiveModelCancelInvoicePayload,
    IStoreInjections,
    Promise<CancelInvoiceResp>
  >;
  subscribeInvoice: Thunk<IReceiveModel, void, IStoreInjections, IStoreModel>;
  setInvoiceSubscriptionStarted: Action<IReceiveModel, boolean>;
  // TURBOTODO: Nitesh - Unsure why this exists?
  // setInvoiceSubscriptionResource: Action<IReceiveModel, EmitterSubscription | undefined>;

  setInvoiceTmpData: Action<IReceiveModel, IInvoiceTempData>;
  deleteInvoiceTmpData: Action<IReceiveModel, string>;

  invoiceSubscriptionStarted: boolean; // TODO make computed value
  invoiceSubscription?: EmitterSubscription;
  invoiceTempData: { [key: string]: IInvoiceTempData };
}

export const receive: IReceiveModel = {
  initialize: thunk(async (actions, _, { getState }) => {
    if (getState().invoiceSubscriptionStarted) {
      log.w("Receive.initialize() called when subscription already started");
      return;
    }

    subscribeInvoices(
      {},
      (res) => {},
      (err) => {
        log.w("An error occourred subscribing to invoices", [err]);
      },
    );
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

      // TURBOTODO: Nitesh - Unsure why this exists?
      // actions.setInvoiceSubscriptionResource(undefined);
    }
  }),

  addInvoice: thunk(async (actions, payload, { getStoreState, getStoreActions }) => {
    log.d("addInvoice()");
    const name = getStoreState().settings.name;
    const invoiceExpiry = getStoreState().settings.invoiceExpiry;
    const description = payload.skipNameDesc
      ? payload.description
      : setupDescription(payload.description, name);

    const result = await addInvoice({
      value: BigInt(payload.sat),
      memo: description,
      expiry: payload.expiry ? BigInt(payload.expiry) : BigInt(invoiceExpiry),
      descriptionHash: payload.tmpData?.lightningBox?.descHash,
      rPreimage: payload.preimage,
    });
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

  addInvoiceBlixtLsp: thunk(async (actions, payload, { getStoreState, getStoreActions }) => {
    log.d("addInvoice()");
    const name = getStoreState().settings.name;
    const description = setupDescription(payload.description, name);

    const result = await addInvoice({
      rPreimage: payload.preimage,
      value: BigInt(payload.sat),
      memo: description,
      expiry: BigInt(600),
      routeHints: [
        {
          hopHints: [
            {
              nodeId: payload.servicePubkey,
              chanId: payload.chanId,
              cltvExpiryDelta: payload.cltvExpiryDelta,
              feeBaseMsat: payload.feeBaseMsat,
              feeProportionalMillionths: payload.feeProportionalMillionths,
            },
          ],
        },
      ],
    });

    // (payload.sat, description, payload.expiry);
    log.d("addInvoice() result", [result]);
    getStoreActions().clipboardManager.addToInvoiceCache(result.paymentRequest);

    payload.tmpData = payload.tmpData ?? {
      type: "DUNDER_ONDEMANDCHANNEL",
      payer: null,
      website: null,
    };

    if (payload.tmpData) {
      actions.setInvoiceTmpData({
        ...payload.tmpData,
        rHash: bytesToHexString(result.rHash),
        type: "DUNDER_ONDEMANDCHANNEL",
      });
    }

    return result;
  }),

  cancelInvoice: thunk(async (_, payload, {}) => {
    return await invoicesCancelInvoice({ paymentHash: hexToUint8Array(payload.rHash) });
  }),

  subscribeInvoice: thunk((actions, _2, { getState, dispatch, getStoreState, getStoreActions }) => {
    if (getState().invoiceSubscriptionStarted) {
      log.d("Receive.subscribeInvoice() called when subscription already started");
      return;
    }
    subscribeInvoices(
      {},
      async (invoice) => {
        try {
          log.i("New invoice event");
          const error = checkLndStreamErrorResponse("SubscribeInvoices", e);
          if (error === "EOF") {
            return;
          } else if (error) {
            log.d("Got error from SubscribeInvoices", [error]);
            throw error;
          }

          const rHash = bytesToHexString(invoice.rHash);
          log.d("invoice", [rHash]);

          const paymentRequest = invoice.paymentRequest
            ? await decodePayReq({ payReq: invoice.paymentRequest })
            : undefined;

          if (invoice.isKeysend) {
            if (invoice.state !== Invoice_InvoiceState.SETTLED) {
              log.i("Found keysend payment, but waiting for invoice state SETTLED");
              return;
            }
          }

          // TODO in the future we should handle
          // both value (the requested amount in the payreq)
          // and amtPaidMsat (the actual amount paid)
          // if (!Long.isLong(invoice.value)) {
          //   invoice.value = Long.fromValue(invoice.value);
          // }
          // if (!Long.isLong(invoice.valueMsat)) {
          //   invoice.amtPaidSat = Long.fromValue(invoice.amtPaidSat);
          // }
          // if (!Long.isLong(invoice.amtPaidMsat)) {
          //   invoice.amtPaidMsat = Long.fromValue(invoice.amtPaidMsat);
          // }

          const tmpData: IInvoiceTempData = getState().invoiceTempData[rHash] ?? {
            rHash,
            payer: null,
            type: "NORMAL",
            website: null,
          };

          const transaction: ITransaction = {
            description: invoice.memo || (invoice.isKeysend ? "Keysend payment" : ""),
            value: Long.fromNumber(Number(invoice.value)) ?? Long.fromNumber(0),
            valueMsat: Long.fromNumber(Number(invoice.valueMsat)) ?? Long.fromNumber(0),
            amtPaidSat: Long.fromNumber(Number(invoice.amtPaidSat)),
            amtPaidMsat: Long.fromNumber(Number(invoice.amtPaidMsat)),
            fee: null,
            feeMsat: null,
            date: Long.fromNumber(Number(invoice.creationDate)),
            duration: 0,
            expire: paymentRequest
              ? Long.fromNumber(Number(invoice.creationDate) + Number(paymentRequest.expiry))
              : Long.fromNumber(0),
            remotePubkey: paymentRequest ? paymentRequest.destination : "", // TODO
            status: decodeInvoiceState(invoice.state),
            paymentRequest: invoice.paymentRequest,
            rHash,
            nodeAliasCached: null,
            valueUSD: null,
            valueFiat: null,
            valueFiatCurrency: null,
            tlvRecordName: null,
            lightningAddress: null,
            lud16IdentifierMimeType: null,

            payer: tmpData.payer,
            website: tmpData.website,
            identifiedService: identifyService(null, "", tmpData.website),

            type: tmpData.type,
            locationLat: null,
            locationLong: null,

            preimage: invoice.rPreimage,
            lnurlPayResponse: null,
            lud18PayerData: tmpData.lightningBox?.payerData ?? null,

            hops: [],
          };

          if (invoice.state === Invoice_InvoiceState.SETTLED) {
            const fiatUnit = getStoreState().settings.fiatUnit;
            const valFiat = valueFiat(invoice.amtPaidSat, getStoreState().fiat.currentRate);

            transaction.valueUSD = valueFiat(
              invoice.amtPaidSat,
              getStoreState().fiat.fiatRates.USD.last,
            );
            transaction.valueFiat = valFiat;
            transaction.valueFiatCurrency = fiatUnit;

            let tlvRecordWhatSatMessage: string | undefined = undefined;
            let isSatogram = false;
            // Loop through known TLV records
            for (const htlc of invoice.htlcs) {
              if (htlc.customRecords) {
                for (const [customRecordKey, customRecordValue] of Object.entries(
                  htlc.customRecords,
                )) {
                  const decodedTLVRecord = decodeTLVRecord(customRecordKey);
                  if (decodedTLVRecord === TLV_RECORD_NAME) {
                    const tlvRecordName = uint8ArrayToUnicodeString(customRecordValue);
                    log.i("Found TLV_RECORD_NAME 🎉", [tlvRecordName]);
                    transaction.tlvRecordName = tlvRecordName;
                  } else if (decodedTLVRecord === TLV_WHATSAT_MESSAGE) {
                    tlvRecordWhatSatMessage = uint8ArrayToUnicodeString(customRecordValue);
                    log.i("Found TLV_WHATSAT_MESSAGE 🎉", [tlvRecordWhatSatMessage]);
                    if (invoice.isKeysend) {
                      transaction.description = tlvRecordWhatSatMessage;
                    }
                  } else if (decodedTLVRecord === TLV_SATOGRAM) {
                    log.i("Got a Satogram");
                    isSatogram = true;
                  } else {
                    log.i("Unknown TLV record", [decodedTLVRecord]);
                  }
                }
              }
            }

            const bitcoinUnit = getStoreState().settings.bitcoinUnit;
            let message = `Received ${formatBitcoin(
              invoice.amtPaidSat,
              bitcoinUnit,
            )} (${valFiat.toFixed(2)} ${fiatUnit})`;
            if (transaction.tlvRecordName ?? transaction.payer ?? transaction.website) {
              message += ` from ${
                transaction.tlvRecordName ?? transaction.payer ?? transaction.website
              }`;
            }
            if (tlvRecordWhatSatMessage) {
              message += ` with the message: ` + tlvRecordWhatSatMessage;
            }

            if (!isSatogram) {
              getStoreActions().notificationManager.localNotification({
                message,
              });
            }

            // We can now delete the temp data
            // as the invoice has been settled
            actions.deleteInvoiceTmpData(rHash);
          } else if (invoice.state === Invoice_InvoiceState.OPEN) {
            if (tmpData.callback) {
              tmpData.callback(invoice.paymentRequest);
            }
          }

          if (
            transaction.payer === "Hampus Sjöberg" ||
            transaction.payer === "Hampus Sjoberg" ||
            transaction.tlvRecordName === "Hampus Sjöberg" ||
            transaction.tlvRecordName === "Hampus Sjoberg"
          ) {
            transaction.identifiedService = "hampus";
          }

          setTimeout(async () => {
            await dispatch.channel.getBalance();
            await dispatch.fiat.getRate();
          }, 500);
          await dispatch.transaction.syncTransaction(transaction);
        } catch (error: any) {
          log.e("Error receiving invoice", [error]);
          toast("Error receiving payment: " + error.message, undefined, "danger");
        }
      },
      (e) => {
        log.w("An error occourred inside receive invoice subscription", [e]);
      },
    );
    actions.setInvoiceSubscriptionStarted(true);
    // actions.setInvoiceSubscriptionResource(invoiceSubscription);
    log.i("Transaction subscription started");
  }),

  setInvoiceSubscriptionStarted: action((state, payload) => {
    state.invoiceSubscriptionStarted = payload;
  }),

  // TURBOTODO: Nitesh - Unsure why this exists?
  // setInvoiceSubscriptionResource: action((state, payload) => {
  //   state.invoiceSubscription = payload;
  // }),

  setInvoiceTmpData: action((state, payload) => {
    state.invoiceTempData = {
      ...state.invoiceTempData,
      [payload.rHash!]: payload,
    };
  }),

  deleteInvoiceTmpData: action((state, payload) => {
    const tmpData = { ...state.invoiceTempData };
    delete tmpData[payload];
    state.invoiceTempData = tmpData;
  }),

  invoiceSubscriptionStarted: false,
  invoiceTempData: {},
};

function decodeInvoiceState(invoiceState: Invoice_InvoiceState) {
  switch (invoiceState) {
    case Invoice_InvoiceState.ACCEPTED:
      return "ACCEPTED";
    case Invoice_InvoiceState.CANCELED:
      return "CANCELED";
    case Invoice_InvoiceState.OPEN:
      return "OPEN";
    case Invoice_InvoiceState.SETTLED:
      return "SETTLED";
    default:
      return "UNKNOWN";
  }
}

import * as Bech32 from "bech32";

import { Action, Thunk, action, thunk } from "easy-peasy";
import { getGeolocation, hexToUint8Array, uint8ArrayToString } from "../utils";
import { lnrpc, routerrpc } from "../../proto/lightning";

import { ILNUrlPayResponse } from "./LNURL";
import { IStoreInjections } from "./store";
import { IStoreModel } from "./index";
import { ITransaction } from "../storage/database/transaction";
import { LnBech32Prefix } from "../utils/build";
import Long from "long";
import { PLATFORM } from "../utils/constants";
import { identifyService } from "../utils/lightning-services";
import logger from "./../utils/log";
import { valueFiat } from "../utils/bitcoin-units";

let ReactNativePermissions: any;
if (PLATFORM !== "macos") {
  ReactNativePermissions = require("react-native-permissions");
}

const log = logger("Send");

type PaymentRequest = string;

export interface ISendModelSetPaymentPayload {
  paymentRequestStr: PaymentRequest;
  extraData?: IExtraData;
}

export interface IModelSendPaymentPayload {
  amount?: Long;
  outgoingChannelId?: Long;
  isAmpInvoice?: boolean;
}

export interface IModelQueryRoutesPayload {
  amount: Long;
  pubKey: string;
  routeHints?: lnrpc.IRouteHint[];
}

interface IExtraData {
  payer: string | null;
  type: ITransaction["type"];
  website: string | null;
  lnurlPayResponse: ILNUrlPayResponse | null;
  lightningAddress: string | null;
  lud16IdentifierMimeType: string | null;
  lnurlPayTextPlain: string | null;
}

export interface ISendModel {
  clear: Action<ISendModel>;
  setPayment: Thunk<
    ISendModel,
    ISendModelSetPaymentPayload,
    IStoreInjections,
    {},
    Promise<lnrpc.PayReq>
  >;
  sendPayment: Thunk<
    ISendModel,
    IModelSendPaymentPayload | void,
    IStoreInjections,
    IStoreModel,
    Promise<lnrpc.Payment>
  >;
  queryRoutesForFeeEstimate: Thunk<
    ISendModel,
    IModelQueryRoutesPayload,
    IStoreInjections,
    IStoreModel,
    Promise<lnrpc.QueryRoutesResponse>
  >;

  setPaymentRequestStr: Action<ISendModel, PaymentRequest>;
  setPaymentRequest: Action<ISendModel, lnrpc.PayReq>;
  setRemoteNodeInfo: Action<ISendModel, lnrpc.NodeInfo>;
  setExtraData: Action<ISendModel, IExtraData>;

  paymentRequestStr?: PaymentRequest;
  remoteNodeInfo?: lnrpc.NodeInfo;
  paymentRequest?: lnrpc.PayReq;
  extraData?: IExtraData;
}

export const send: ISendModel = {
  clear: action((state) => {
    state.paymentRequestStr = undefined;
    state.remoteNodeInfo = undefined;
    state.paymentRequest = undefined;
    state.extraData = undefined;
  }),

  queryRoutesForFeeEstimate: thunk(async (_, payload, { injections }) => {
    const queryRoutes = injections.lndMobile.index.queryRoutes;
    return await queryRoutes(payload.pubKey, payload.amount, payload.routeHints);
  }),

  /**
   * @throws
   */
  setPayment: thunk(async (actions, payload, { injections }) => {
    actions.clear();
    const decodePayReq = injections.lndMobile.index.decodePayReq;
    const getNodeInfo = injections.lndMobile.index.getNodeInfo;
    const paymentRequestStr = payload.paymentRequestStr.replace(/^lightning:/i, "");

    try {
      if (!checkBech32(paymentRequestStr, LnBech32Prefix)) {
        throw new Error();
      }
    } catch (e) {
      throw new Error("Code is not a valid Bitcoin Lightning invoice");
    }
    actions.setPaymentRequestStr(paymentRequestStr);

    let paymentRequest;
    try {
      paymentRequest = await decodePayReq(paymentRequestStr);
      actions.setPaymentRequest(paymentRequest);
    } catch (e) {
      throw new Error("Code is not a valid Lightning invoice");
    }

    if (payload.extraData) {
      actions.setExtraData(payload.extraData);
    }

    try {
      const nodeInfo = await getNodeInfo(paymentRequest.destination);
      actions.setRemoteNodeInfo(nodeInfo);
    } catch (e) {}

    return paymentRequest;
  }),

  /**
   * @throws
   */
  sendPayment: thunk(
    async (_, payload, { getState, dispatch, injections, getStoreState, getStoreActions }) => {
      const start = new Date().getTime();

      const sendPaymentV2Sync = injections.lndMobile.index.sendPaymentV2Sync;
      const paymentRequestStr = getState().paymentRequestStr;
      const paymentRequest = getState().paymentRequest;
      const remoteNodeInfo = getState().remoteNodeInfo;
      let outgoingChannelId = undefined;

      if (paymentRequestStr === undefined || paymentRequest === undefined) {
        throw new Error("Payment information missing");
      }

      // If this is a zero sum
      // invoice, hack the value in
      if (!paymentRequest.numSatoshis && payload && payload.amount) {
        paymentRequest.numSatoshis = payload.amount;
        paymentRequest.numMsat = payload.amount.mul(1000);
      }

      if (!!payload && !!payload.outgoingChannelId) {
        outgoingChannelId = payload.outgoingChannelId;
      }

      const extraData: IExtraData = getState().extraData ?? {
        payer: null,
        type: "NORMAL",
        website: null,
        lnurlPayResponse: null,
        lightningAddress: null,
        lud16IdentifierMimeType: null,
        lnurlPayTextPlain: null,
      };

      const name = getStoreState().settings.name;
      const multiPathPaymentsEnabled = getStoreState().settings.multiPathPaymentsEnabled;
      const maxLNFeePercentage = getStoreState().settings.maxLNFeePercentage;
      const getTransactionByPaymentRequest =
        getStoreState().transaction.getTransactionByPaymentRequest;

      const isAmpInvoice = payload && payload.isAmpInvoice ? true : false;

      // getTransactionByPaymentRequest only if isAmpInvoice is false
      const transactionByPaymentRequest = !isAmpInvoice
        ? getTransactionByPaymentRequest(paymentRequestStr)
        : undefined;

      // Pre-settlement tx insert
      const preTransaction: ITransaction = transactionByPaymentRequest ?? {
        date: paymentRequest.timestamp,
        description: extraData.lnurlPayTextPlain ?? paymentRequest.description,
        duration: 0,
        expire: paymentRequest.expiry,
        paymentRequest: paymentRequestStr,
        remotePubkey: paymentRequest.destination,
        rHash: paymentRequest.paymentHash,
        status: "OPEN",
        value: paymentRequest.numSatoshis.neg(),
        valueMsat: paymentRequest.numSatoshis.neg().mul(1000),
        amtPaidSat: paymentRequest.numSatoshis.neg(),
        amtPaidMsat: paymentRequest.numSatoshis.neg().mul(1000),
        fee: Long.fromInt(0),
        feeMsat: Long.fromInt(0),
        nodeAliasCached:
          (remoteNodeInfo && remoteNodeInfo.node && remoteNodeInfo.node.alias) || null,
        payer: extraData.payer,
        valueUSD: valueFiat(paymentRequest.numSatoshis, getStoreState().fiat.fiatRates.USD.last),
        valueFiat: valueFiat(paymentRequest.numSatoshis, getStoreState().fiat.currentRate),
        valueFiatCurrency: getStoreState().settings.fiatUnit,
        locationLong: null,
        locationLat: null,
        tlvRecordName: null,
        type: extraData.type,
        website: extraData.website,
        identifiedService: identifyService(
          paymentRequest.destination,
          paymentRequest.description,
          extraData.website,
        ),
        ampInvoice: isAmpInvoice,
        //note: // TODO: Why wasn't this added
        lightningAddress: extraData.lightningAddress ?? null,
        lud16IdentifierMimeType: extraData.lud16IdentifierMimeType ?? null,

        preimage: hexToUint8Array("0"),
        lnurlPayResponse: extraData.lnurlPayResponse,
        lud18PayerData: null,

        hops: [],
      };

      log.d("IPreTransaction", [preTransaction]);
      await dispatch.transaction.syncTransaction(preTransaction);

      let sendPaymentResult: lnrpc.Payment | undefined;
      try {
        sendPaymentResult = await sendPaymentV2Sync(
          paymentRequestStr,
          payload && payload.amount ? Long.fromValue(payload.amount) : undefined,
          paymentRequest.numSatoshis,
          name,
          multiPathPaymentsEnabled,
          maxLNFeePercentage,
          outgoingChannelId,
          payload && payload.isAmpInvoice ? true : false,
        );
      } catch (error) {
        await dispatch.transaction.syncTransaction({
          ...preTransaction,
          status: preTransaction.status === "SETTLED" ? preTransaction.status : "CANCELED",
        });
        throw error;
      }

      log.i("status", [sendPaymentResult.status, sendPaymentResult.failureReason]);
      if (sendPaymentResult.status !== lnrpc.Payment.PaymentStatus.SUCCEEDED) {
        await dispatch.transaction.syncTransaction({
          ...preTransaction,
          status: "CANCELED",
        });
        throw new Error(`${translatePaymentFailureReason(sendPaymentResult.failureReason)}`);
      }

      const settlementDuration = new Date().getTime() - start;

      const transaction: ITransaction = {
        ...preTransaction,
        duration: settlementDuration,
        status: "SETTLED",
        fee: sendPaymentResult.fee || Long.fromInt(0),
        feeMsat: sendPaymentResult.feeMsat || Long.fromInt(0),

        preimage: hexToUint8Array(sendPaymentResult.paymentPreimage),
        ampInvoice: isAmpInvoice,

        hops:
          sendPaymentResult.htlcs[0].route?.hops?.map((hop) => ({
            chanId: hop.chanId ?? null,
            chanCapacity: hop.chanCapacity ?? null,
            amtToForward: hop.amtToForward || Long.fromInt(0),
            amtToForwardMsat: hop.amtToForwardMsat || Long.fromInt(0),
            fee: hop.fee || Long.fromInt(0),
            feeMsat: hop.feeMsat || Long.fromInt(0),
            expiry: hop.expiry || null,
            pubKey: hop.pubKey || null,
          })) ?? [],
      };

      log.d("ITransaction", [transaction]);
      await dispatch.transaction.syncTransaction(transaction);

      if (getStoreState().settings.transactionGeolocationEnabled) {
        try {
          log.d("Syncing geolocation for transaction");
          if (PLATFORM === "ios") {
            if (
              (await ReactNativePermissions.check(
                ReactNativePermissions.PERMISSIONS.IOS.LOCATION_WHEN_IN_USE,
              )) === "denied"
            ) {
              log.d("Requesting geolocation permission");
              const r = await ReactNativePermissions.request(
                ReactNativePermissions.PERMISSIONS.IOS.LOCATION_WHEN_IN_USE,
              );
              if (r !== "granted") {
                throw new Error(`Got "${r}" when requesting Geolocation permission`);
              }
            }
          }

          const coords = await getGeolocation();
          transaction.locationLong = coords.longitude;
          transaction.locationLat = coords.latitude;
          await dispatch.transaction.syncTransaction(transaction);
        } catch (error) {
          log.i(`Error getting geolocation for transaction: ${JSON.stringify(error)}`, [error]);
        }
      }

      return sendPaymentResult;
    },
  ),

  setPaymentRequestStr: action((state, payload) => {
    state.paymentRequestStr = payload;
  }),
  setPaymentRequest: action((state, payload) => {
    state.paymentRequest = payload;
  }),
  setRemoteNodeInfo: action((state, payload) => {
    state.remoteNodeInfo = payload;
  }),
  setExtraData: action((state, payload) => {
    state.extraData = payload;
  }),
};

const checkBech32 = (bech32: string, prefix: string): boolean => {
  const decodedBech32 = Bech32.bech32.decode(bech32, 4096);
  if (decodedBech32.prefix.slice(0, prefix.length).toUpperCase() !== prefix.toUpperCase()) {
    return false;
  }
  return true;
};

export const translatePaymentFailureReason = (reason: lnrpc.PaymentFailureReason) => {
  if (reason === lnrpc.PaymentFailureReason.FAILURE_REASON_NONE) {
    throw new Error("Payment failed");
  } else if (reason === lnrpc.PaymentFailureReason.FAILURE_REASON_TIMEOUT) {
    return "Payment timed out";
  } else if (reason === lnrpc.PaymentFailureReason.FAILURE_REASON_NO_ROUTE) {
    return "Could not find route to recipient";
  } else if (reason === lnrpc.PaymentFailureReason.FAILURE_REASON_ERROR) {
    return "The payment failed to proceed";
  } else if (reason === lnrpc.PaymentFailureReason.FAILURE_REASON_INCORRECT_PAYMENT_DETAILS) {
    return "Incorrect payment details provided";
  } else if (reason === lnrpc.PaymentFailureReason.FAILURE_REASON_INSUFFICIENT_BALANCE) {
    return "Insufficient balance";
  }
  return "Unknown error";
};

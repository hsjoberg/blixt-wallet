import { Action, action, Thunk, thunk } from "easy-peasy";
import * as Bech32 from "bech32";
import Long from "long";

import { IStoreModel } from "./index";
import { IStoreInjections } from "./store";
import { ITransaction } from "../storage/database/transaction";
import { lnrpc } from "../../proto/proto";
import { valueFiat } from "../utils/bitcoin-units";
import { LnBech32Prefix } from "../utils/build";
import { getGeolocation, hexToUint8Array } from "../utils";

import logger from "./../utils/log";
import { ILNUrlPayResponse } from "./LNURL";
import { identifyService } from "../utils/lightning-services";
const log = logger("Send");

type PaymentRequest = string;

export interface ISendModelSetPaymentPayload {
  paymentRequestStr: PaymentRequest;
  extraData?: IExtraData;
}

export interface IModelSendPaymentPayload {
  amount?: Long;
}

interface IExtraData {
  payer: string | null;
  type: ITransaction["type"];
  website: string | null;
  lnurlPayResponse: ILNUrlPayResponse | null;
}

export interface ISendModel {
  clear: Action<ISendModel>;
  setPayment: Thunk<ISendModel, ISendModelSetPaymentPayload, IStoreInjections, Promise<lnrpc.PayReq>>;
  sendPayment: Thunk<ISendModel, IModelSendPaymentPayload | void, IStoreInjections, IStoreModel, Promise<lnrpc.Payment>>;
  sendPaymentOld: Thunk<ISendModel, IModelSendPaymentPayload | void, IStoreInjections, IStoreModel, Promise<lnrpc.SendResponse>>;

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
  clear: action((state) =>  {
    state.paymentRequestStr = undefined;
    state.remoteNodeInfo = undefined;
    state.paymentRequest = undefined;
    state.extraData = undefined;
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

    // if (Long.fromValue(paymentRequest.numSatoshis).equals(0)) {
    //   throw new Error("Zero amount invoices are not supported");
    // }

    if (payload.extraData) {
      actions.setExtraData(payload.extraData);
    }

    try {
      const nodeInfo = await getNodeInfo(paymentRequest.destination);
      actions.setRemoteNodeInfo(nodeInfo);
    } catch (e) { }

    return paymentRequest;
  }),

  /**
   * @throws
   */
  sendPayment: thunk(async (_, payload, { getState, dispatch, injections, getStoreState }) => {
    const sendPaymentV2Sync = injections.lndMobile.index.sendPaymentV2Sync;
    const paymentRequestStr = getState().paymentRequestStr;
    const paymentRequest = getState().paymentRequest;
    const remoteNodeInfo = getState().remoteNodeInfo;

    if (paymentRequestStr === undefined || paymentRequest === undefined) {
      throw new Error("Payment information missing");
    }

    // If this is a zero sum
    // invoice, hack the value in
    if (!paymentRequest.numSatoshis && payload && payload.amount) {
      paymentRequest.numSatoshis = payload.amount;
      paymentRequest.numMsat = payload.amount.mul(1000);
    }

    const name = getStoreState().settings.name;

    // Attempt to pay invoice
    // First try with TLV and then without
    const sendPaymentResult = await (async () => {
      if (name && (paymentRequest.features["8"] || paymentRequest.features["9"])) {
        log.i("Attempting to pay with TLV");
        const tlvAttempt = await sendPaymentV2Sync(
          paymentRequestStr,
          payload && payload.amount ? Long.fromValue(payload.amount) : undefined,
          name
        );
        log.i("First status", [tlvAttempt.status]);
        if (tlvAttempt.status === lnrpc.Payment.PaymentStatus.SUCCEEDED) {
          return tlvAttempt;
        }
        log.i("Didn't succeed. Trying without TLV");
      }

      log.i("Attempting to pay");
      const nonTlvAttempt = await sendPaymentV2Sync(
        paymentRequestStr,
        payload && payload.amount ? Long.fromValue(payload.amount) : undefined,
        undefined
      );
      log.i("Second status", [nonTlvAttempt.status]);

      if (!(nonTlvAttempt.status === lnrpc.Payment.PaymentStatus.SUCCEEDED)) {
        throw new Error(`${translatePaymentFailureReason(nonTlvAttempt.failureReason)}`);
      }
      return nonTlvAttempt;
    })();

    const extraData: IExtraData = getState().extraData || {
      payer: null,
      type: "NORMAL",
      website: null,
      lnurlPayResponse: null,
    };

    const transaction: ITransaction = {
      date: paymentRequest.timestamp,
      description: paymentRequest.description,
      expire: paymentRequest.expiry,
      paymentRequest: paymentRequestStr,
      remotePubkey: paymentRequest.destination,
      rHash: paymentRequest.paymentHash,
      status: "SETTLED",
      value: paymentRequest.numSatoshis.neg(),
      valueMsat: paymentRequest.numSatoshis.neg().mul(1000),
      amtPaidSat: paymentRequest.numSatoshis.neg(),
      amtPaidMsat: paymentRequest.numSatoshis.neg().mul(1000),
      fee: sendPaymentResult.fee || Long.fromInt(0),
      feeMsat: sendPaymentResult.feeMsat || Long.fromInt(0),
      nodeAliasCached: (remoteNodeInfo && remoteNodeInfo.node && remoteNodeInfo.node.alias) || null,
      payer: extraData.payer,
      valueUSD: valueFiat(paymentRequest.numSatoshis, getStoreState().fiat.fiatRates.USD.last),
      valueFiat: valueFiat(paymentRequest.numSatoshis, getStoreState().fiat.currentRate),
      valueFiatCurrency: getStoreState().settings.fiatUnit,
      locationLong: null,
      locationLat: null,
      tlvRecordName: null,
      type: extraData.type,
      website: extraData.website,
      identifiedService: identifyService(paymentRequest.destination, paymentRequest.description, extraData.website),

      preimage: hexToUint8Array(sendPaymentResult.paymentPreimage),
      lnurlPayResponse: extraData.lnurlPayResponse,

      hops: sendPaymentResult.htlcs[0].route?.hops?.map((hop) => ({
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
        const coords = await getGeolocation();
        transaction.locationLong = coords.longitude;
        transaction.locationLat = coords.latitude;
        await dispatch.transaction.syncTransaction(transaction);
      } catch (error) {
        log.i(`Error getting geolocation for transaction: ${JSON.stringify(error)}`, [error]);
      }
    }

    return sendPaymentResult;
  }),

  sendPaymentOld: thunk(async (_, payload, { getState, dispatch, injections, getStoreState }) => {
    const sendPaymentSync = injections.lndMobile.index.sendPaymentSync;
    const paymentRequestStr = getState().paymentRequestStr;
    const paymentRequest = getState().paymentRequest;
    const remoteNodeInfo = getState().remoteNodeInfo;

    if (paymentRequestStr === undefined || paymentRequest === undefined) {
      throw new Error("Payment information missing");
    }

    // If this is a zero sum
    // invoice, hack the value in
    if (!paymentRequest.numSatoshis && payload && payload.amount) {
      paymentRequest.numSatoshis = payload.amount;
      paymentRequest.numMsat = payload.amount.mul(1000);
    }

    const name = getStoreState().settings.name;

    // Attempt to pay invoice
    // First try with TLV and then without
    const sendPaymentResult = await (async () => {
      if (name && (paymentRequest.features["8"] || paymentRequest.features["9"])) {
        log.i("Attempting to pay with TLV");
        const tlvAttempt = await sendPaymentSync(
          paymentRequestStr,
          payload && payload.amount ? Long.fromValue(payload.amount) : undefined,
          name
        );
        if (!(tlvAttempt.paymentError && tlvAttempt.paymentError.length > 0)) {
          return tlvAttempt;
        }
        log.i("Didn't succeed. Trying without TLV");
      }

      log.i("Attempting to pay");
      const nonTlvAttempt = await sendPaymentSync(
        paymentRequestStr,
        payload && payload.amount ? Long.fromValue(payload.amount) : undefined,
        undefined
      );

      if (nonTlvAttempt.paymentError && nonTlvAttempt.paymentError.length > 0) {
        throw new Error(nonTlvAttempt.paymentError);
      }
      return nonTlvAttempt;
    })();

    const extraData: IExtraData = getState().extraData || {
      payer: null,
      type: "NORMAL",
      website: null,
      lnurlPayResponse: null,
    };

    const transaction: ITransaction = {
      date: paymentRequest.timestamp,
      description: paymentRequest.description,
      expire: paymentRequest.expiry,
      paymentRequest: paymentRequestStr,
      remotePubkey: paymentRequest.destination,
      rHash: paymentRequest.paymentHash,
      status: "SETTLED",
      value: paymentRequest.numSatoshis.neg(),
      valueMsat: paymentRequest.numSatoshis.neg().mul(1000),
      amtPaidSat: paymentRequest.numSatoshis.neg(),
      amtPaidMsat: paymentRequest.numSatoshis.neg().mul(1000),
      fee:
        (sendPaymentResult.paymentRoute &&
        sendPaymentResult.paymentRoute.totalFees) || Long.fromInt(0),
      feeMsat:
        (sendPaymentResult.paymentRoute &&
        sendPaymentResult.paymentRoute.totalFeesMsat) || Long.fromInt(0),
      nodeAliasCached: (remoteNodeInfo && remoteNodeInfo.node && remoteNodeInfo.node.alias) || null,
      payer: extraData.payer,
      valueUSD: valueFiat(paymentRequest.numSatoshis, getStoreState().fiat.fiatRates.USD.last),
      valueFiat: valueFiat(paymentRequest.numSatoshis, getStoreState().fiat.currentRate),
      valueFiatCurrency: getStoreState().settings.fiatUnit,
      locationLong: null,
      locationLat: null,
      tlvRecordName: null,
      type: extraData.type,
      website: extraData.website,
      identifiedService: identifyService(paymentRequest.destination, paymentRequest.description, extraData.website),

      preimage: sendPaymentResult.paymentPreimage,
      lnurlPayResponse: extraData.lnurlPayResponse,

      hops: sendPaymentResult.paymentRoute!.hops!.map((hop) => ({
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
        const coords = await getGeolocation();
        transaction.locationLong = coords.longitude;
        transaction.locationLat = coords.latitude;
        await dispatch.transaction.syncTransaction(transaction);
      } catch (error) {
        log.i(`Error getting geolocation for transaction: ${JSON.stringify(error)}`, [error]);
      }
    }

    return sendPaymentResult;
  }),

  setPaymentRequestStr: action((state, payload) => { state.paymentRequestStr = payload; }),
  setPaymentRequest: action((state, payload) => { state.paymentRequest = payload; }),
  setRemoteNodeInfo: action((state, payload) => { state.remoteNodeInfo = payload; }),
  setExtraData: action((state, payload) => { state.extraData = payload; }),
};

const checkBech32 = (bech32: string, prefix: string): boolean => {
  const decodedBech32 = Bech32.decode(bech32, 1024);
  if (decodedBech32.prefix.slice(0, prefix.length).toUpperCase() !== prefix.toUpperCase()) {
    return false;
  }
  return true;
};

const translatePaymentFailureReason = (reason: lnrpc.PaymentFailureReason) => {
  if (reason === lnrpc.PaymentFailureReason.FAILURE_REASON_NONE) {
    throw new Error("Payment failed");
  }
  else if (reason === lnrpc.PaymentFailureReason.FAILURE_REASON_TIMEOUT) {
    return "Payment timed out";
  }
  else if (reason === lnrpc.PaymentFailureReason.FAILURE_REASON_NO_ROUTE) {
    return "Could not find route to recipient";
  }
  else if (reason === lnrpc.PaymentFailureReason.FAILURE_REASON_ERROR) {
    return "The payment failed to proceed";
  }
  else if (reason === lnrpc.PaymentFailureReason.FAILURE_REASON_INCORRECT_PAYMENT_DETAILS) {
    return "Incorrect payment details provided";
  }
  else if (reason === lnrpc.PaymentFailureReason.FAILURE_REASON_INSUFFICIENT_BALANCE) {
    return "Insufficient balance";
  }
  return "Unknown error";
}
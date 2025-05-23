import * as Bech32 from "bech32";

import { Action, Thunk, action, thunk } from "easy-peasy";
import {
  bytesToString,
  getGeolocation,
  hexToUint8Array,
  unicodeStringToUint8Array,
} from "../utils";

import { ILNUrlPayResponse } from "./LNURL";
import { IStoreInjections } from "./store";
import { IStoreModel } from "./index";
import { ITransaction } from "../storage/database/transaction";
import { LnBech32Prefix } from "../utils/build";
import { PLATFORM, TLV_KEYSEND, TLV_RECORD_NAME, TLV_WHATSAT_MESSAGE } from "../utils/constants";
import { identifyService } from "../utils/lightning-services";
import { valueFiat } from "../utils/bitcoin-units";

import {
  FeatureBit,
  NodeInfo,
  Payment,
  Payment_PaymentStatus,
  PaymentFailureReason,
  PayReq,
  QueryRoutesResponse,
  RouteHint,
} from "react-native-turbo-lnd/protos/lightning_pb";
import {
  decodePayReq,
  getNodeInfo,
  queryRoutes,
  routerSendPaymentV2,
} from "react-native-turbo-lnd";
import { SendPaymentRequestSchema } from "react-native-turbo-lnd/protos/routerrpc/router_pb";
import { create } from "@bufbuild/protobuf";

let ReactNativePermissions: any;
if (PLATFORM !== "macos") {
  ReactNativePermissions = require("react-native-permissions");
}

import logger from "./../utils/log";
import sha from "sha.js";
const log = logger("Send");

type PaymentRequest = string;

export interface ISendModelSetPaymentPayload {
  paymentRequestStr: PaymentRequest;
  extraData?: IExtraData;
}

export interface IModelSendPaymentPayload {
  amount?: bigint;
  outgoingChannelId?: bigint;
}

export interface IModelQueryRoutesPayload {
  amount: bigint;
  pubKey: string;
  routeHints?: RouteHint[];
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
  setPayment: Thunk<ISendModel, ISendModelSetPaymentPayload, IStoreInjections, {}, Promise<PayReq>>;
  sendPayment: Thunk<
    ISendModel,
    IModelSendPaymentPayload | void,
    IStoreInjections,
    IStoreModel,
    Promise<Payment>
  >;
  queryRoutesForFeeEstimate: Thunk<
    ISendModel,
    IModelQueryRoutesPayload,
    IStoreInjections,
    IStoreModel,
    Promise<QueryRoutesResponse>
  >;

  setPaymentRequestStr: Action<ISendModel, PaymentRequest>;
  setPaymentRequest: Action<ISendModel, PayReq>;
  setRemoteNodeInfo: Action<ISendModel, NodeInfo>;
  setExtraData: Action<ISendModel, IExtraData>;

  paymentRequestStr?: PaymentRequest;
  remoteNodeInfo?: NodeInfo;
  paymentRequest?: PayReq;
  extraData?: IExtraData;
}

export const send: ISendModel = {
  clear: action((state) => {
    state.paymentRequestStr = undefined;
    state.remoteNodeInfo = undefined;
    state.paymentRequest = undefined;
    state.extraData = undefined;
  }),

  queryRoutesForFeeEstimate: thunk(async (_, payload, {}) => {
    return await queryRoutes({
      pubKey: payload.pubKey,
      amt: payload.amount,
      routeHints: payload.routeHints,
    });
  }),

  /**
   * @throws
   */
  setPayment: thunk(async (actions, payload, {}) => {
    actions.clear();
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
      paymentRequest = await decodePayReq({ payReq: paymentRequestStr });
      actions.setPaymentRequest(paymentRequest);
    } catch (e) {
      throw new Error("Code is not a valid Lightning invoice");
    }

    if (payload.extraData) {
      actions.setExtraData(payload.extraData);
    }

    try {
      const nodeInfo = await getNodeInfo({ pubKey: paymentRequest.destination });
      actions.setRemoteNodeInfo(nodeInfo);
    } catch (e) {}

    return paymentRequest;
  }),

  /**
   * @throws
   */
  sendPayment: thunk(async (_, payload, { getState, dispatch, getStoreState }) => {
    const start = new Date().getTime();

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
      paymentRequest.numMsat = payload.amount * 1000n;
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

    //TURBOTODO: Fix this type error
    // Pre-settlement tx insert
    const preTransaction: ITransaction = getTransactionByPaymentRequest(paymentRequestStr) ?? {
      date: paymentRequest.timestamp,
      description: extraData.lnurlPayTextPlain ?? paymentRequest.description,
      duration: 0,
      expire: paymentRequest.expiry,
      paymentRequest: paymentRequestStr,
      remotePubkey: paymentRequest.destination,
      rHash: paymentRequest.paymentHash,
      status: "OPEN",
      value: 0n - paymentRequest.numSatoshis,
      valueMsat: 0n - paymentRequest.numSatoshis * 1000n,
      amtPaidSat: 0n - paymentRequest.numSatoshis,
      amtPaidMsat: 0n - paymentRequest.numSatoshis * 1000n,
      fee: 0n,
      feeMsat: 0n,
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
      identifiedService: identifyService(
        paymentRequest.destination,
        paymentRequest.description,
        extraData.website,
      ),
      //note: // TODO: Why wasn't this added
      lightningAddress: extraData.lightningAddress ?? null,
      lud16IdentifierMimeType: extraData.lud16IdentifierMimeType ?? null,
      lud18PayerData: null,

      preimage: hexToUint8Array("0"),
      lnurlPayResponse: extraData.lnurlPayResponse,

      hops: [],
    };

    log.d("IPreTransaction", [preTransaction]);
    await dispatch.transaction.syncTransaction(preTransaction);

    let sendPaymentResult: Payment | undefined;
    try {
      sendPaymentResult = await sendPaymentV2TurboLnd(
        paymentRequestStr,
        payload?.amount,
        paymentRequest.numSatoshis,
        name,
        multiPathPaymentsEnabled,
        maxLNFeePercentage,
        outgoingChannelId,
      );
    } catch (error) {
      await dispatch.transaction.syncTransaction({
        ...preTransaction,
        status: preTransaction.status === "SETTLED" ? preTransaction.status : "CANCELED",
      });
      throw error;
    }

    log.i("status", [sendPaymentResult.status, sendPaymentResult.failureReason]);
    if (sendPaymentResult.status !== Payment_PaymentStatus.SUCCEEDED) {
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
      fee: sendPaymentResult.fee,
      feeMsat: sendPaymentResult.feeSat,

      preimage: hexToUint8Array(sendPaymentResult.paymentPreimage),

      hops:
        sendPaymentResult.htlcs[0].route?.hops?.map((hop) => ({
          chanId: BigInt(hop.chanId),
          chanCapacity: hop.chanCapacity,
          amtToForward: hop.amtToForwardMsat / 1000n,
          amtToForwardMsat: hop.amtToForwardMsat,
          fee: hop.feeMsat / 1000n,
          feeMsat: hop.feeMsat,
          expiry: hop.expiry,
          pubKey: hop.pubKey,
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
  }),

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

export const translatePaymentFailureReason = (reason: PaymentFailureReason) => {
  if (reason === PaymentFailureReason.FAILURE_REASON_NONE) {
    throw new Error("Payment failed");
  } else if (reason === PaymentFailureReason.FAILURE_REASON_TIMEOUT) {
    return "Payment timed out";
  } else if (reason === PaymentFailureReason.FAILURE_REASON_NO_ROUTE) {
    return "Could not find route to recipient";
  } else if (reason === PaymentFailureReason.FAILURE_REASON_ERROR) {
    return "The payment failed to proceed";
  } else if (reason === PaymentFailureReason.FAILURE_REASON_INCORRECT_PAYMENT_DETAILS) {
    return "Incorrect payment details provided";
  } else if (reason === PaymentFailureReason.FAILURE_REASON_INSUFFICIENT_BALANCE) {
    return "Insufficient balance";
  }
  return "Unknown error";
};

export const sendPaymentV2TurboLnd = (
  paymentRequest: string,
  amount?: bigint,
  payAmount?: bigint,
  tlvRecordName?: string | null,
  multiPath?: boolean,
  maxLNFeePercentage: number = 2,
  outgoingChanId?: bigint,
): Promise<Payment> => {
  const maxFeeRatio = (maxLNFeePercentage ?? 2) / 100;
  const feeLimitSat = BigInt(Math.floor(Math.max(10, Number(payAmount || 0) * maxFeeRatio)));

  const options = create(SendPaymentRequestSchema, {
    paymentRequest,
    noInflightUpdates: true,
    timeoutSeconds: 60,
    maxParts: multiPath ? 16 : 1,
    feeLimitSat,
    cltvLimit: 0,
    outgoingChanIds: outgoingChanId ? [outgoingChanId] : [],
  });

  if (amount) {
    options.amt = amount;
  }
  if (tlvRecordName && tlvRecordName.length > 0) {
    options.destCustomRecords = {
      [TLV_RECORD_NAME]: unicodeStringToUint8Array(tlvRecordName),
    };
  }

  return new Promise(async (resolve, reject) => {
    const listener = routerSendPaymentV2(
      options,
      (response) => {
        if (response.paymentRequest === paymentRequest) {
          listener();
          resolve(response);
        }
      },
      (error) => {
        reject(error);
      },
    );
  });
};

export const sendKeysendPaymentV2TurboLnd = (
  pubkey: Uint8Array,
  amount: bigint,
  preimage: Uint8Array,
  tlvRecordNameStr: string,
  tlvRecordWhatSatMessageStr: string,
  maxLNFeePercentage: number,
  routeHints?: RouteHint[],
): Promise<Payment> => {
  const maxFeeRatio = (maxLNFeePercentage ?? 2) / 100;
  const feeLimitSat = BigInt(Math.floor(Math.max(10, Number(amount || 0) * maxFeeRatio)));

  const paymentHash = sha("sha256").update(preimage).digest();

  const options = create(SendPaymentRequestSchema, {
    noInflightUpdates: true,
    timeoutSeconds: 60,
    feeLimitSat,
    dest: pubkey,
    paymentHash,
    destFeatures: [FeatureBit.TLV_ONION_REQ],
    amt: amount,
    routeHints,
    destCustomRecords: {
      // 5482373484 is the record for lnd
      // keysend payments as described in
      // https://github.com/lightningnetwork/lnd/releases/tag/v0.9.0-beta
      [TLV_KEYSEND]: preimage,
    },
  });

  if (tlvRecordNameStr && tlvRecordNameStr.length > 0) {
    options.destCustomRecords![TLV_RECORD_NAME] = unicodeStringToUint8Array(tlvRecordNameStr);
  }
  if (tlvRecordWhatSatMessageStr && tlvRecordWhatSatMessageStr.length > 0) {
    options.destCustomRecords![TLV_WHATSAT_MESSAGE] = unicodeStringToUint8Array(
      tlvRecordWhatSatMessageStr,
    );
  }

  return new Promise(async (resolve, reject) => {
    const listener = routerSendPaymentV2(
      options,
      (response) => {
        listener();
        resolve(response);
      },
      (error) => {
        reject(error);
      },
    );
  });
};

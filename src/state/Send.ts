import { Action, action, Thunk, thunk } from "easy-peasy";
import * as Bech32 from "bech32";
import Long from "long";

import { IStoreModel } from "./index";
import { IStoreInjections } from "./store";
import { ITransaction } from "../storage/database/transaction";
import { lnrpc } from "../../proto/proto";
import { valueFiat } from "../utils/bitcoin-units";
import { LnBech32Prefix } from "../utils/build";

type PaymentRequest = string;

export interface ISendModelSetPaymentPayload {
  paymentRequestStr: PaymentRequest;
}

export interface IModelSendPaymentPayload {
  paymentRequest: string;
  invoiceInfo: lnrpc.PayReq;
}

export interface ISendModel {
  clear: Action<ISendModel>;
  setPayment: Thunk<ISendModel, ISendModelSetPaymentPayload, IStoreInjections>;
  sendPayment: Thunk<ISendModel, void, IStoreInjections, IStoreModel, Promise<boolean>>;

  setPaymentRequestStr: Action<ISendModel, PaymentRequest>;
  setPaymentRequest: Action<ISendModel, lnrpc.PayReq>;
  setRemoteNodeInfo: Action<ISendModel, lnrpc.NodeInfo>;

  paymentRequestStr?: PaymentRequest;
  remoteNodeInfo?: lnrpc.NodeInfo;
  paymentRequest?: lnrpc.PayReq;
}

export const send: ISendModel = {
  clear: action((state) =>  {
    state.paymentRequestStr = undefined;
    state.remoteNodeInfo = undefined;
    state.paymentRequest = undefined;
  }),

  /**
   * @throws
   */
  setPayment: thunk(async (actions, payload, { injections }) => {
    actions.clear();
    const { decodePayReq, getNodeInfo } = injections.lndMobile.index;
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
    try {
      const nodeInfo = await getNodeInfo(paymentRequest.destination);
      actions.setRemoteNodeInfo(nodeInfo);
    } catch (e) { }
  }),

  /**
   * @throws
   */
  sendPayment: thunk(async (_, _2, { getState, dispatch, injections, getStoreState }) => {
    const { sendPaymentSync } = injections.lndMobile.index;
    const { paymentRequestStr, paymentRequest, remoteNodeInfo } = getState();
    if (paymentRequestStr === undefined || paymentRequest === undefined) {
      throw new Error("Payment information missing");
    }

    const sendPaymentResult = await sendPaymentSync(paymentRequestStr);
    if (sendPaymentResult.paymentError && sendPaymentResult.paymentError.length > 0) {
      throw new Error(sendPaymentResult.paymentError);
    }

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
      payer: null,
      valueUSD: valueFiat(paymentRequest.numSatoshis, getStoreState().fiat.fiatRates.USD.last),
      valueFiat: valueFiat(paymentRequest.numSatoshis, getStoreState().fiat.currentRate),
      valueFiatCurrency: getStoreState().settings.fiatUnit,

      hops: sendPaymentResult.paymentRoute!.hops!.map((hop) => ({
        chanId: hop.chanId ?? null,
        chanCapacity: hop.chanCapacity ?? null,
        amtToForward: hop.amtToForward || Long.fromInt(0),
        amtToForwardMsat: hop.amtToForwardMsat || Long.fromInt(0),
        fee: hop.fee || Long.fromInt(0),
        feeMsat: hop.feeMsat || Long.fromInt(0),
        expiry: hop.expiry || null,
        pubKey: hop.pubKey || null,
      })),
    };

    console.log("ITransaction", transaction);
    await dispatch.transaction.syncTransaction(transaction);

    return true;
  }),

  setPaymentRequestStr: action((state, payload) => { state.paymentRequestStr = payload; }),
  setPaymentRequest: action((state, payload) => { state.paymentRequest = payload; }),
  setRemoteNodeInfo: action((state, payload) => { state.remoteNodeInfo = payload; }),
};

const checkBech32 = (bech32: string, prefix: string): boolean => {
  const decodedBech32 = Bech32.decode(bech32, 1024);
  if (decodedBech32.prefix.slice(0, prefix.length).toUpperCase() !== prefix.toUpperCase()) {
    return false;
  }
  return true;
};

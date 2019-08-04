import { Action, action, Thunk, thunk } from "easy-peasy";
import * as Bech32 from "bech32";

import { IStoreModel } from "./index";
import { IStoreInjections } from "./store";
import { ITransaction } from "../storage/database/transaction";
import { lnrpc } from "../../proto/proto";

const LN_BECH32_PREFIX = "lntb";

type PaymentRequest = string;

export interface ISendModelSetPaymentPayload {
  paymentRequestStr: PaymentRequest;
}

export interface IModelSendPaymentPayload {
  paymentRequest: string;
  invoiceInfo: lnrpc.PayReq;
}

export interface ISendModel {
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
  /**
   * @throws
   */
  setPayment: thunk(async (actions, payload, { injections }) => {
    const { decodePayReq, getNodeInfo } = injections.lndMobile.index;
    const paymentRequestStr = payload.paymentRequestStr.replace(/^lightning:/, "");

    try {
      if (!checkBech32(paymentRequestStr, LN_BECH32_PREFIX)) {
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

    const nodeInfo = await getNodeInfo(paymentRequest.destination);
    actions.setRemoteNodeInfo(nodeInfo);
  }),

  /**
   * @throws
   */
  sendPayment: thunk(async (_, _2, { getState, dispatch, injections }) => {
    const { sendPaymentSync } = injections.lndMobile.index;
    const { paymentRequestStr, paymentRequest, remoteNodeInfo } = getState();
    if (paymentRequestStr === undefined || paymentRequest === undefined || remoteNodeInfo === undefined) {
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
      value: -paymentRequest.numSatoshis,
      valueMsat: -(paymentRequest.numSatoshis * 1000),
      fee: sendPaymentResult.paymentRoute!.totalFees! || 0,
      feeMsat: sendPaymentResult.paymentRoute!.totalFeesMsat! || 0,
      nodeAliasCached: remoteNodeInfo.node && remoteNodeInfo.node.alias,

      hops: sendPaymentResult.paymentRoute!.hops!.map((hop) => ({
        chanId: hop.chanId ?? null,
        chanCapacity: hop.chanCapacity ?? null,
        amtToForward: hop.amtToForward || 0,
        amtToForwardMsat: hop.amtToForwardMsat || 0,
        fee: hop.fee || 0,
        feeMsat: hop.feeMsat || 0,
        expiry: hop.expiry || null,
        pubKey: hop.pubKey || null,
      })),
    };

    console.log("ITransaction", transaction);
    await dispatch.transaction.syncTransaction(transaction);

    return true;
  }),

  setPaymentRequestStr: action((state, payload) => { state.paymentRequestStr = payload }),
  setPaymentRequest: action((state, payload) => { state.paymentRequest = payload }),
  setRemoteNodeInfo: action((state, payload) => { state.remoteNodeInfo = payload }),
};

const checkBech32 = (bech32: string, prefix: string): boolean => {
  const decodedBech32 = Bech32.decode(bech32, 1024);
  if (decodedBech32.prefix.slice(0, prefix.length).toUpperCase() !== prefix.toUpperCase()) {
    return false;
  }
  return true;
};

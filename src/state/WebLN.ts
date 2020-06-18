import { Alert } from "react-native";
import { Thunk, thunk } from "easy-peasy";
import { GetInfoResponse, RequestInvoiceResponse, RequestInvoiceArgs, SendPaymentResponse, UnsupportedMethodError, SignMessageResponse, } from "webln";

import { IStoreModel } from "./index";
import logger from "./../utils/log";
import { bytesToHexString, getDomainFromURL } from "../utils";
import { navigate } from "../utils/navigation";
import { convertBitcoinToFiat } from "../utils/bitcoin-units";

const log = logger("WebLN");

interface IHandleMakeInvoiceRequestPayload {
  requestUrl: string;
  data: string | number | RequestInvoiceArgs;
}

interface IHandleSendPaymentRequestPayload {
  requestUrl: string;
  data: string;
  weblnPayment: boolean;
}

interface IHandleSignMessageRequestPayload {
  data: string;
}

interface IHandleVerifyMessageRequestPayload {
  data: {
    signature: string;
    message: string;
  };
}

interface IHandleLNURLPayload {
  lnurl: string;
}

export interface IWebLNModel {
  handleGetInfoRequest: Thunk<IWebLNModel, void, any, IStoreModel, Promise<GetInfoResponse>>;
  handleMakeInvoiceRequest: Thunk<IWebLNModel, IHandleMakeInvoiceRequestPayload, any, IStoreModel, Promise<RequestInvoiceResponse>>;
  handleSendPaymentRequest: Thunk<IWebLNModel, IHandleSendPaymentRequestPayload, any, IStoreModel, Promise<SendPaymentResponse>>;
  handleSignMessageRequest: Thunk<IWebLNModel, IHandleSignMessageRequestPayload, any, IStoreModel, Promise<SignMessageResponse>>;
  handleVerifyMessageRequest: Thunk<IWebLNModel, IHandleVerifyMessageRequestPayload, any, IStoreModel, Promise<SignMessageResponse>>;
  handleLNURL: Thunk<IWebLNModel, IHandleLNURLPayload, any, IStoreModel>;
};

export const webln: IWebLNModel = {
  handleGetInfoRequest: thunk(async (actions, payload, { getStoreState }) => {
    log.d("Handling WebLN getInfo request", [payload]);
    const nodeInfo = getStoreState().lightning.nodeInfo;

    // TODO throw if node is not ready

    return {
      node: {
        alias: nodeInfo!.alias!,
        pubkey: nodeInfo!.identityPubkey!,
        color: nodeInfo!.color!,
      },
    }
  }),


  handleMakeInvoiceRequest: thunk(async (actions, { data, requestUrl }, { getStoreActions, getStoreState }) => {
    let amount: number;
    let memo = "";
    if (typeof data === "string") {
      amount = Number.parseInt(data, 10);
    }
    else if (typeof data === "number") {
      amount = data;
    }
    else {
      if (typeof data.amount === "string") {
        amount = Number.parseInt(data.amount, 10);
      }
      else if (typeof data.amount === "number") {
        amount = data.amount;
      }
      else {
        amount = 0;
      }
      memo = data.defaultMemo || "";
    }

    try {
      await new Promise((resolve, reject) => {
        const rate = getStoreState().fiat.currentRate;
        const fiatUnit = getStoreState().settings.fiatUnit;
        const fiat = convertBitcoinToFiat(amount, rate, fiatUnit);
        Alert.alert(
          `Invoice request`,
          `Website wants to pay you ${amount} satoshi (${fiat}). Do you want to accept that?`,
          [{
            text: "Yes",
            style: "default",
            onPress: () => resolve()
          }, {
            text: "No",
            style: "default",
            onPress: () => reject()
          }]
        );
      });

      const response = await getStoreActions().receive.addInvoice({
        tmpData: {
          payer: null,
          website: requestUrl.replace('http://', '').replace('https://', '').split(/[/?#]/)[0],
          type: "WEBLN",
        },
        description: memo,
        sat: amount,
      });

      return {
        paymentRequest: response.paymentRequest,
      };
    } catch (e) {
      log.d("Error creating invoice", [e]);
      throw new Error("Denied");
    }
  }),

  handleSendPaymentRequest: thunk(async (actions, { requestUrl, data: paymentRequestStr, weblnPayment }, { getStoreActions, getStoreState }) => {
    try {
      const paymentRequest = await getStoreActions().send.setPayment({
        paymentRequestStr,
        extraData: {
          payer: null,
          type: weblnPayment ? "WEBLN" : "NORMAL",
          website: getDomainFromURL(requestUrl),
          lnurlPayResponse: null,
        }
      });

      await new Promise((resolve, reject) => {
        let balance = '';
        if (paymentRequest!.numSatoshis) {
          const rate = getStoreState().fiat.currentRate;
          const fiatUnit = getStoreState().settings.fiatUnit;
          const fiat = convertBitcoinToFiat(paymentRequest.numSatoshis, rate, fiatUnit);
          balance = ` of ${paymentRequest!.numSatoshis} satoshi (${fiat})`;
        }
        Alert.alert(
          `Payment request${weblnPayment ? " (WebLN)" : ""}`,
          `Website requests you to pay an invoice${balance}.`,
          [{
            text: "Yes",
            style: "default",
            onPress: () => resolve(),
          }, {
            text: "No",
            style: "default",
            onPress: () => reject("Denied"),
          }]
        );
      });

      const p: Promise<SendPaymentResponse> = new Promise((resolve, reject) => {
        navigate("Send", {
          screen: "SendConfirmation",
          params: {
            callback: (paymentPreimage: Uint8Array) => {
              if (paymentPreimage) {
                resolve({
                  preimage: bytesToHexString(paymentPreimage)
                });
              }
              else {
                reject(new Error("Denied."));
              }
            }
          }
        });
      });

      return p;
    } catch (e) {
      log.d("Exception", [e]);
      throw e;
    }
  }),

  handleSignMessageRequest: thunk(() => {
    throw new UnsupportedMethodError('Message sign not supported yet.');
  }),

  handleVerifyMessageRequest: thunk(() => {
    throw new UnsupportedMethodError('Message verify not supported yet.');
  }),

  handleLNURL: thunk(async (actions, payload, {getStoreActions }) => {
    log.i("LNURL");
    const paymentRequestStr = payload.lnurl;
    return new Promise(async (resolve, reject) => {
      try {
        const type = await getStoreActions().lnUrl.setLNUrl(paymentRequestStr);
        if (type === "channelRequest") {
          Alert.alert(
            "Found LNURL channel request",
            `Found an LNURL. Do you wish to continue?`,
            [{
              text: "Cancel",
              onPress: () => {
                getStoreActions().lnUrl.clear();
                resolve();
              }
            }, {
              text: "Continue",
              onPress: () => {
                navigate("LNURL", { screen: "ChannelRequest" });
                resolve();
              }
            }]
          );
        }
        else if (type === "login") {
          navigate("LNURL", { screen: "AuthRequest" });
          resolve();
        }
        else if (type === "withdrawRequest") {
          navigate("LNURL", { screen: "WithdrawRequest" });
          resolve();
        }
        else if (type === "payRequest") {
          navigate("LNURL", { screen: "PayRequest" });
          resolve();
        }
        else {
          console.log("Unknown lnurl request: " + type);
          getStoreActions().lnUrl.clear();
          resolve();
        }
      } catch (e) {
        resolve();
      }
    });
  }),
}
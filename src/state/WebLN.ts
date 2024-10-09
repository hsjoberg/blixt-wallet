import { Thunk, thunk } from "easy-peasy";
import {
  GetInfoResponse,
  RequestInvoiceResponse,
  RequestInvoiceArgs,
  SendPaymentResponse,
  SignMessageResponse,
} from "webln";

import { IStoreModel } from "./index";
import { bytesToHexString, getDomainFromURL, stringToUint8Array } from "../utils";
import { navigate } from "../utils/navigation";
import { convertBitcoinToFiat } from "../utils/bitcoin-units";
import { Alert } from "../utils/alert";
import { IStoreInjections } from "./store";

import { signMessage, verifyMessage } from "react-native-turbo-lnd";

import logger from "./../utils/log";
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
  requestUrl: string;
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
  handleGetInfoRequest: Thunk<
    IWebLNModel,
    void,
    IStoreInjections,
    IStoreModel,
    Promise<GetInfoResponse>
  >;
  handleMakeInvoiceRequest: Thunk<
    IWebLNModel,
    IHandleMakeInvoiceRequestPayload,
    IStoreInjections,
    IStoreModel,
    Promise<RequestInvoiceResponse>
  >;
  handleSendPaymentRequest: Thunk<
    IWebLNModel,
    IHandleSendPaymentRequestPayload,
    IStoreInjections,
    IStoreModel,
    Promise<SendPaymentResponse>
  >;
  handleSignMessageRequest: Thunk<
    IWebLNModel,
    IHandleSignMessageRequestPayload,
    IStoreInjections,
    IStoreModel,
    Promise<SignMessageResponse>
  >;
  handleVerifyMessageRequest: Thunk<
    IWebLNModel,
    IHandleVerifyMessageRequestPayload,
    IStoreInjections,
    IStoreModel,
    Promise<void>
  >;
  handleLNURL: Thunk<IWebLNModel, IHandleLNURLPayload, any, IStoreModel>;
}

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
    };
  }),

  handleMakeInvoiceRequest: thunk(
    async (actions, { data, requestUrl }, { getStoreActions, getStoreState }) => {
      let amount: number;
      let memo = "";
      if (typeof data === "string") {
        amount = Number.parseInt(data, 10);
      } else if (typeof data === "number") {
        amount = data;
      } else {
        if (typeof data.amount === "string") {
          amount = Number.parseInt(data.amount, 10);
        } else if (typeof data.amount === "number") {
          amount = data.amount;
        } else {
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
            [
              {
                text: "Yes",
                style: "default",
                onPress: () => resolve(null),
              },
              {
                text: "No",
                style: "default",
                onPress: () => reject(),
              },
            ],
          );
        });

        const response = await getStoreActions().receive.addInvoice({
          tmpData: {
            payer: null,
            website: requestUrl.replace("http://", "").replace("https://", "").split(/[/?#]/)[0],
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
    },
  ),

  handleSendPaymentRequest: thunk(
    async (
      actions,
      { requestUrl, data: paymentRequestStr, weblnPayment },
      { getStoreActions, getStoreState },
    ) => {
      try {
        const paymentRequest = await getStoreActions().send.setPayment({
          paymentRequestStr,
          extraData: {
            payer: null,
            type: weblnPayment ? "WEBLN" : "NORMAL",
            website: getDomainFromURL(requestUrl),
            lnurlPayResponse: null,
            lightningAddress: null,
            lud16IdentifierMimeType: null,
            lnurlPayTextPlain: null,
          },
        });

        await new Promise((resolve, reject) => {
          let balance = "";
          if (paymentRequest!.numSatoshis) {
            const rate = getStoreState().fiat.currentRate;
            const fiatUnit = getStoreState().settings.fiatUnit;
            const fiat = convertBitcoinToFiat(paymentRequest.numSatoshis, rate, fiatUnit);
            balance = ` of ${paymentRequest!.numSatoshis} satoshi (${fiat})`;
          }
          Alert.alert(
            `Payment request${weblnPayment ? " (WebLN)" : ""}`,
            `Website requests you to pay an invoice${balance}.`,
            [
              {
                text: "Yes",
                style: "default",
                onPress: () => resolve(null),
              },
              {
                text: "No",
                style: "default",
                onPress: () => reject("Denied"),
              },
            ],
          );
        });

        const p: Promise<SendPaymentResponse> = new Promise((resolve, reject) => {
          navigate("Send", {
            screen: "SendConfirmation",
            params: {
              callback: (paymentPreimage: Uint8Array) => {
                if (paymentPreimage) {
                  resolve({
                    preimage: bytesToHexString(paymentPreimage),
                  });
                } else {
                  reject(new Error("Denied."));
                }
              },
            },
          });
        });

        return p;
      } catch (e) {
        log.d("Exception", [e]);
        throw e;
      }
    },
  ),

  handleSignMessageRequest: thunk((_, { data, requestUrl }) => {
    log.i("handleSignMessage");

    return new Promise((resolve, reject) => {
      Alert.alert(
        "Sign request",
        `${getDomainFromURL(requestUrl)} asks you to sign a message:\n\n${data}`,
        [
          {
            style: "cancel",
            text: "Cancel",
            onPress: () => {
              reject("Cancel");
            },
          },
          {
            style: "default",
            text: "Sign message",
            onPress: async () => {
              const result = await signMessage({
                msg: stringToUint8Array(data),
              });
              resolve({
                message: data,
                signature: result.signature,
              });
            },
          },
        ],
      );
    });
  }),

  handleVerifyMessageRequest: thunk(async (_, { data }) => {
    const response = await verifyMessage({
      msg: stringToUint8Array(data.message),
      signature: data.signature,
    });
    log.i("", [response]);
    if (response.valid) {
      return void 0;
    }
    throw new Error("Invalid signature.");
  }),

  handleLNURL: thunk(async (_, payload, { getStoreActions }) => {
    log.i("LNURL");
    const paymentRequestStr = payload.lnurl;
    return new Promise(async (resolve, reject) => {
      try {
        const type = await getStoreActions().lnUrl.setLNUrl({ bech32data: paymentRequestStr });
        if (type === "channelRequest") {
          Alert.alert("Found LNURL channel request", `Found an LNURL. Do you wish to continue?`, [
            {
              text: "Cancel",
              onPress: () => {
                getStoreActions().lnUrl.clear();
                resolve(null);
              },
            },
            {
              text: "Continue",
              onPress: () => {
                navigate("LNURL", { screen: "ChannelRequest" });
                resolve(null);
              },
            },
          ]);
        } else if (type === "login") {
          navigate("LNURL", { screen: "AuthRequest" });
          resolve(null);
        } else if (type === "withdrawRequest") {
          navigate("LNURL", { screen: "WithdrawRequest" });
          resolve(null);
        } else if (type === "payRequest") {
          navigate("LNURL", { screen: "PayRequest" });
          resolve(null);
        } else {
          console.log("Unknown lnurl request: " + type);
          getStoreActions().lnUrl.clear();
          resolve(null);
        }
      } catch (e) {
        resolve(null);
      }
    });
  }),
};

import { Thunk, thunk } from "easy-peasy";
import { CONSTANTS, JSHash } from "react-native-hash";

import { IStoreModel } from "./index";
import logger from "./../utils/log";
import { LndMobileEventEmitter } from "../utils/event-listener";
import { IStoreInjections } from "./store";
import { ILNUrlPayRequest, ILNUrlPayResponse } from "./LNURL";
import { bytesToHexString, bytesToString, hexToUint8Array } from "../utils";

const LnurlPayRequestLNP2PType = 32768 + 691;

interface ILnurlPayForwardP2PMessage {
  id: number;
  request:
    | "LNURLPAY_REQUEST1"
    | "LNURLPAY_REQUEST1_RESPONSE"
    | "LNURLPAY_REQUEST2"
    | "LNURLPAY_REQUEST2_RESPONSE";
  data: any;
}

const log = logger("LightningBox");

export interface ILightningBoxModel {
  initialize: Thunk<ILightningBoxModel>;

  subscribeCustomMessages: Thunk<ILightningBoxModel, void, IStoreInjections, IStoreModel>;
};

export const lightningBox: ILightningBoxModel = {
  initialize: thunk(async (actions, _) => {
    log.i("Initializing Lightning Box subsystem");
    await actions.subscribeCustomMessages();
  }),

  subscribeCustomMessages: thunk(async (_, _2, { getStoreActions, injections }) => {
    LndMobileEventEmitter.addListener("SubscribeCustomMessages", async (e: any) => {
      log.i("NEW CUSTOM MESSAGE");
      const customMessage = injections.lndMobile.index.decodeCustomMessage(e.data);
      log.d("customMessage", [customMessage]);

      if (customMessage.type !== LnurlPayRequestLNP2PType) {
        log.e(`Unknown custom message type ${customMessage.type}`);
        return;
      }

      try {
        const payload = JSON.parse(bytesToString(customMessage.data)) as ILnurlPayForwardP2PMessage;

        if (payload.request === "LNURLPAY_REQUEST1") {
          log.d("request === LNURLPAY_REQUEST1");

          const lnurlPayResponse: ILNUrlPayRequest = {
            // callback: "N/A",
            tag: "payRequest",
            minSendable: 1 * 1000,
            maxSendable: 1000 * 1000,
            metadata: JSON.stringify([
              ["text/plain", "Cheers!"],
            ]),
          };

          const p2pResponse: ILnurlPayForwardP2PMessage = {
            id: payload.id,
            request: "LNURLPAY_REQUEST1_RESPONSE",
            data: lnurlPayResponse,
          };

          injections.lndMobile.index.sendCustomMessage(bytesToHexString(customMessage.peer), LnurlPayRequestLNP2PType, JSON.stringify(p2pResponse));
        } else if (payload.request === "LNURLPAY_REQUEST2") {
          log.d("request === LNURLPAY_REQUEST2");

          const descHash = await JSHash(JSON.stringify([
            ["text/plain", "Cheers!"],
          ]), CONSTANTS.HashAlgorithms.sha256);

          getStoreActions().receive.addInvoice({
            description: "Lightning Box",
            sat: Math.floor(payload.data.amount / 1000),
            tmpData: {
              callback: (pr: string) => {
                const lnurlPayResponse2: ILNUrlPayResponse = {
                  pr,
                  routes: [],
                  successAction: null,
                };

                const p2pResponse: ILnurlPayForwardP2PMessage = {
                  id: payload.id,
                  request: "LNURLPAY_REQUEST2_RESPONSE",
                  data: lnurlPayResponse2,
                };

                injections.lndMobile.index.sendCustomMessage(bytesToHexString(customMessage.peer), LnurlPayRequestLNP2PType, JSON.stringify(p2pResponse));
              },
              payer: null,
              type: "LIGHTNINGBOX_FORWARD",
              website: null,
              lightningBox: {
                descHash: hexToUint8Array(descHash),
              },
            },
          });
        }
      } catch (error) {
        log.e("Error processing custom message", [error.message]);
      }
    });
    injections.lndMobile.index.subscribeCustomMessages();
  }),

}

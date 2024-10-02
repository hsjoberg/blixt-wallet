import { Thunk, thunk } from "easy-peasy";
import { CONSTANTS, JSHash } from "react-native-hash";

import { IStoreModel } from "./index";
import logger from "./../utils/log";
import { IStoreInjections } from "./store";
import {
  ILNUrlPayRequest,
  ILNUrlPayRequestPayerData,
  ILNUrlPayResponse,
  ILNUrlPayResponseError,
  ILNUrlPayResponsePayerData,
} from "./LNURL";
import { hexToUint8Array, stringToUint8Array, uint8ArrayToUnicodeString } from "../utils";
import { sendCustomMessage, subscribeCustomMessages } from "react-native-turbo-lnd";

const LnurlPayRequestLNP2PType = 32768 + 691;
const PeerSwapMessagesRange = [42069, 42085];

interface ILnurlPayForwardP2PMessage {
  id: number;
  request:
    | "LNURLPAY_REQUEST1"
    | "LNURLPAY_REQUEST1_RESPONSE"
    | "LNURLPAY_REQUEST2"
    | "LNURLPAY_REQUEST2_RESPONSE";
  data: any;
  metadata?: any;
}

const lnboxPayerDataRequest: ILNUrlPayRequestPayerData = {
  name: { mandatory: false },
  identifier: { mandatory: false },
  email: { mandatory: false },
};

const log = logger("LightningBox");

export interface ILightningBoxModel {
  initialize: Thunk<ILightningBoxModel>;

  subscribeCustomMessages: Thunk<ILightningBoxModel, void, IStoreInjections, IStoreModel>;
}

export const lightningBox: ILightningBoxModel = {
  initialize: thunk(async (actions, _) => {
    log.i("Initializing Lightning Box subsystem");
    await actions.subscribeCustomMessages();
  }),

  subscribeCustomMessages: thunk(async (_, _2, { getStoreActions, getStoreState }) => {
    const messageSubscription = subscribeCustomMessages(
      {},
      async (customMessage) => {
        try {
          log.i("NEW CUSTOM MESSAGE");
          log.d("customMessage", [customMessage]);

          if (customMessage.type !== LnurlPayRequestLNP2PType) {
            if (
              customMessage.type >= PeerSwapMessagesRange[0] ||
              customMessage.type <= PeerSwapMessagesRange[1]
            ) {
              return;
            }
            log.e(`Unknown custom message type ${customMessage.type}`);
            return;
          }

          const payload = JSON.parse(
            uint8ArrayToUnicodeString(customMessage.data),
          ) as ILnurlPayForwardP2PMessage;
          log.d("payload", [payload]);

          if (payload.request === "LNURLPAY_REQUEST1") {
            log.d("request === LNURLPAY_REQUEST1");

            const maxSendable = getStoreState().channel.remoteBalance;
            const lnurlpDesc = getStoreState().settings.lightningBoxLnurlPayDesc; // TODO move to store initialization

            const metadata = [["text/plain", lnurlpDesc]];
            if (payload?.metadata?.lightningAddress) {
              metadata.push(["text/identifier", payload?.metadata.lightningAddress]);
            }

            // Omit callback as the server will handle that
            const lnurlPayResponse: Omit<ILNUrlPayRequest, "callback"> = {
              tag: "payRequest",
              minSendable: 1 * 1000,
              maxSendable: Number(maxSendable) * 1000,
              metadata: JSON.stringify(metadata),
              commentAllowed: 500,
              payerData: lnboxPayerDataRequest,
            };

            const p2pResponse: ILnurlPayForwardP2PMessage = {
              id: payload.id,
              request: "LNURLPAY_REQUEST1_RESPONSE",
              data: lnurlPayResponse,
            };

            await sendCustomMessage({
              data: stringToUint8Array(JSON.stringify(p2pResponse)),
              peer: customMessage.peer,
              type: LnurlPayRequestLNP2PType,
            });
          } else if (payload.request === "LNURLPAY_REQUEST2") {
            log.d("request === LNURLPAY_REQUEST2");
            const lnurlpDesc = getStoreState().settings.lightningBoxLnurlPayDesc;
            const metadata = [["text/plain", lnurlpDesc]];
            if (payload?.metadata?.lightningAddress) {
              metadata.push(["text/identifier", payload?.metadata.lightningAddress]);
            }

            const metadataStr = JSON.stringify(metadata);
            let dataToHash = metadataStr;

            let payerData: ILNUrlPayResponsePayerData | undefined = undefined;
            let website = null;
            if (payload?.data?.payerdata) {
              try {
                payerData = JSON.parse(payload?.data?.payerdata);
                payerData = {
                  name: payerData?.name,
                  email: payerData?.email,
                  identifier: payerData?.identifier,
                };

                if (
                  (payerData.name && payerData.name?.length > 64) ||
                  (payerData.email && payerData.email?.length > 64) ||
                  (payerData.identifier && payerData.identifier?.length > 64)
                  // (payerData.pubkey && payerData.pubkey?.length > 64)
                  // TODO auth
                ) {
                  throw new Error("Fields too big");
                }

                if (payerData.identifier) {
                  website = payerData.identifier?.split?.("@")[1];
                } else if (payerData.email) {
                  website = payerData.email?.split?.("@")[1];
                }
              } catch (error) {
                log.e("Failed to parse payerData", [error, payload?.data?.payerdata]);
                const lnurlPayResponse2: ILNUrlPayResponseError = {
                  status: "ERROR",
                  reason: "Unable to parse payer data",
                };

                const p2pResponse: ILnurlPayForwardP2PMessage = {
                  id: payload.id,
                  request: "LNURLPAY_REQUEST2_RESPONSE",
                  data: lnurlPayResponse2,
                };

                await sendCustomMessage({
                  data: stringToUint8Array(JSON.stringify(p2pResponse)),
                  peer: customMessage.peer,
                  type: LnurlPayRequestLNP2PType,
                });
                return;
              }
              dataToHash += payload?.data?.payerdata;
            }

            const descHash = await JSHash(dataToHash, CONSTANTS.HashAlgorithms.sha256);

            let description = "Lightning Box";
            if (typeof payload.data.comment === "string") {
              if (payload.data.comment?.length > 500) {
                const lnurlPayResponse2: ILNUrlPayResponseError = {
                  status: "ERROR",
                  reason: "Comment is too long.",
                };

                const p2pResponse: ILnurlPayForwardP2PMessage = {
                  id: payload.id,
                  request: "LNURLPAY_REQUEST2_RESPONSE",
                  data: lnurlPayResponse2,
                };

                await sendCustomMessage({
                  data: stringToUint8Array(JSON.stringify(p2pResponse)),
                  peer: customMessage.peer,
                  type: LnurlPayRequestLNP2PType,
                });
                return;
              }

              description = payload.data.comment;
            }

            // TODO(hsjoberg): LUD-12 to NameDesc is not working properly

            getStoreActions().receive.addInvoice({
              description, // TODO this is ass. Add a new db field
              sat: Math.floor(payload.data.amount / 1000),
              skipNameDesc: true,
              tmpData: {
                callback: async (pr: string) => {
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

                  await sendCustomMessage({
                    data: stringToUint8Array(JSON.stringify(p2pResponse)),
                    peer: customMessage.peer,
                    type: LnurlPayRequestLNP2PType,
                  });
                },
                payer: null,
                type: "LIGHTNINGBOX_FORWARD",
                website,
                lightningBox: {
                  descHash: hexToUint8Array(descHash),
                  payerData,
                },
              },
            });
          }
        } catch (error: any) {
          log.e("Error processing custom message", [error.message]);
        }
      },
      (err) => {
        log.w("An error occourred subscribing to custom messages", [err]);
      },
    );
  }),
};

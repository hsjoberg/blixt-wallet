//
// Sorry for the condition in this file.
// Reach out to me on Telegram @hsjoberg or lnurl mafia group https://t.me/lnurl if you have any questions.
//
import { Action, action, Thunk, thunk } from "easy-peasy";
import * as Bech32 from "bech32";
import secp256k1 from "secp256k1";
import { CONSTANTS, JSHash } from "react-native-hash";
import { Hash as sha256Hash, HMAC as sha256HMAC } from "fast-sha256";

import { IStoreModel } from "./index";
import { IStoreInjections } from "./store";
import { timeout, bytesToString, getDomainFromURL, stringToUint8Array, hexToUint8Array, bytesToHexString, toast } from "../utils/index";
import { lnrpc } from "../../proto/lightning";
import { LndMobileEventEmitter } from "../utils/event-listener";
import { checkLndStreamErrorResponse } from "../utils/lndmobile";
import { Alert } from "../utils/alert";
import { dunderPrompt } from "../utils/dunder";

import logger from "./../utils/log";
const log = logger("LNURL");

export type LNURLType = "channelRequest" | "login" | "withdrawRequest" | "payRequest" | "unknown" | "error" | "unsupported";

export type LightningAddress = string;

export interface ILNUrlError {
  status: "ERROR";
  reason: string;
}

export interface ILNUrlChannelRequest {
  uri: string;
  callback: string;
  k1: string;
  tag: "channelRequest";
}

export interface ILNUrlChannelRequestResponse {
  status: "OK" | "ERROR";
  reason: string;
}

export interface ILNUrlAuthRequest {
  tag: "login",
  k1: string;
}

export interface ILNUrlAuthResponse {
  status: "OK" | "ERROR";
  event?: "REGISTERED" | "LOGGEDIN" | "LINKED" | "AUTHED";
  reason?: string;
}

export interface ILNUrlWithdrawRequest {
  callback: string;
  k1: string;
  maxWithdrawable: number;
  defaultDescription: string;
  minWithdrawable?: number;
  balanceCheck?: string;
  currentBalance?: number;
  payLink?: string;
  tag: "withdrawRequest";
}

export interface ILNUrlWithdrawResponse {
  status: "OK" | "ERROR";
  reason?: string;
}

export type Metadata = [string, string];

export type ILNUrlPayRequestMetadata = Metadata[];

export interface ILNUrlPayRequestPayerData {
  name?: {
    mandatory: boolean;
  };
  pubkey?: {
    mandatory: boolean;
  };
  identifier?: {
    mandatory: boolean;
  };
  email?: {
    mandatory: boolean;
  };
  auth?: {
    mandatory?: boolean;
    k1?: string; // hex
  };
};

export interface ILNUrlPayResponsePayerData {
  name?: string;
  pubkey?: string; // hex
  auth?: {
    key: string;
    k1: string;
    sig: string; // hex
  },
  email?: string;
  identifier?: string;
}

export interface ILNUrlPayRequest {
  callback: string;
  maxSendable: number;
  minSendable: number;
  metadata: string;
  commentAllowed?: number;
  disposable?: boolean | null;
  tag: "payRequest";
  payerData?: ILNUrlPayRequestPayerData;
}

export interface ILNUrlPayResponse {
  pr: string;
  successAction:
    | ILNUrlPayResponseSuccessActionAes
    | ILNUrlPayResponseSuccessActionMessage
    | ILNUrlPayResponseSuccessActionUrl
    | null;
  routes:	any[]; // NOT SUPPORTED
  disposable?: boolean | null;
}

export interface ILNUrlPayResponseSuccessActionUrl {
  tag: "url",
  description: string;
  url: string;
}

export interface ILNUrlPayResponseSuccessActionMessage {
  tag: "message",
  message: string;
}

export interface ILNUrlPayResponseSuccessActionAes {
  tag: "aes",
  description: string;
  ciphertext: string; // base64-encoded
  iv: string; // base64-encoded
}

export interface ILNUrlPayResponseError {
  status: "ERROR";
  reason: string;
}

export interface ILNUrlDummy {
  tag: "X";
}

export interface IDoChannelRequestPayload {
  private: true;
}

interface IDoPayRequestPayload {
  msat: number;
  comment?: string;
  lightningAddress: string | null;
  lud16IdentifierMimeType: string | null;
  metadataTextPlain: string;
  payerData?: ILNUrlPayResponsePayerData;
}

export type IDoPayRequestResponse = ILNUrlPayResponse;

type LNUrlRequest = ILNUrlChannelRequest | ILNUrlAuthRequest | ILNUrlWithdrawRequest | ILNUrlPayRequest | ILNUrlDummy;

export interface ILNUrlModel {
  setLNUrl: Thunk<ILNUrlModel, { bech32data?: string; url?: string }, any, IStoreModel, Promise<LNURLType>>;

  doChannelRequest: Thunk<ILNUrlModel, IDoChannelRequestPayload, IStoreInjections, IStoreModel, Promise<boolean>>;
  doAuthRequest: Thunk<ILNUrlModel, void, IStoreInjections, IStoreModel, Promise<boolean>>;
  doWithdrawRequest: Thunk<ILNUrlModel, { satoshi: number; }, IStoreInjections, IStoreModel, Promise<boolean>>;
  doPayRequest: Thunk<ILNUrlModel, IDoPayRequestPayload, IStoreInjections, IStoreModel, Promise<IDoPayRequestResponse>>;

  setLNUrlStr: Action<ILNUrlModel, string>;
  setType: Action<ILNUrlModel, LNURLType>;
  setLNUrlObject: Action<ILNUrlModel, LNUrlRequest>;
  setPayRequestResponse: Action<ILNUrlModel, ILNUrlPayResponse>;

  lnUrlStr?: string;
  type?: LNURLType;
  lnUrlObject: LNUrlRequest | undefined;
  payRequestResponse: ILNUrlPayResponse | undefined;

  clear: Action<ILNUrlModel>;

  resolveLightningAddress: Thunk<ILNUrlModel, LightningAddress>;
};

export const lnUrl: ILNUrlModel = {
  setLNUrl: thunk(async (actions, { bech32data, url }) => {
    log.i("setLNUrl");
    actions.clear();
    try {
      let type: LNURLType;
      if (bech32data) {
        const decodedBech32 = Bech32.bech32.decode(bech32data, 4096);
        url = bytesToString(Bech32.bech32.fromWords(decodedBech32.words));
      } else if (!url) {
        throw new Error("Neither bech32data or url is provided");
      }
      log.d("url", [url]);
      actions.setLNUrlStr(url);

      const queryParams = parseQueryParams(url);
      log.d("queryParams", [queryParams]);
      // If the data is in the URL
      if ("tag" in queryParams && queryParams.tag === "channelRequest" || queryParams.tag == "login") {
        log.d(`Found tag ${queryParams.tag} in query params`);
        const tag = queryParams.tag; // FIXME

        if (!tryLNURLType(tag)) {
          throw "unknown";
        }

        if (tag === "login") {
          console.log("login");
          type = "login";
        }
        else {
          throw "unknown";
        }
        actions.setLNUrlObject(queryParams); // FIXME
      }
      // If we have to make a GET request to get the data
      else {
        log.d(`GET ${url}, looking for tag`);
        const result = await fetch(url);

        log.v(JSON.stringify(result));
        let lnurlObject: LNUrlRequest | ILNUrlError;
        try {
          lnurlObject = await result.json();
        } catch (e) {
          log.d("", [e]);
          throw new Error("Unable to parse message from the server");
        }
        log.d("response", [lnurlObject]);

        if (isLNUrlPayResponseError(lnurlObject)) {
          throw new Error(lnurlObject.reason);
        }

        log.v(JSON.stringify(lnurlObject));
        if (lnurlObject.tag === "channelRequest") {
          type = "channelRequest";
        }
        else if (lnurlObject.tag === "withdrawRequest") {
          type = "withdrawRequest";
        }
        else if (lnurlObject.tag === "payRequest") {
          type = "payRequest";
        }
        else {
          throw "unknown";
        }
        log.d(`Found tag ${lnurlObject.tag}`);
        actions.setLNUrlObject(lnurlObject);
      }

      actions.setType(type);
      return type;
    } catch (e) {
      throw e;
    }
  }),

  doChannelRequest: thunk(async (_, _2, { getStoreState, getState, injections }) => {
    const type = getState().type;
    const lnUrlObject = getState().lnUrlObject;
    const connectPeer = injections.lndMobile.index.connectPeer;

    if (type === "channelRequest" && lnUrlObject && lnUrlObject.tag === "channelRequest") {
      log.i("Processing channelRequest");
      while (!getStoreState().lightning.nodeInfo) {
        log.i("nodeInfo is not available yet, sleeping for 1000ms");
        await timeout(1000);
      }
      const localPubkey = getStoreState().lightning.nodeInfo!.identityPubkey;
      const [pubkey, host] = lnUrlObject.uri.split("@");
      try {
        await connectPeer(pubkey, host);
      } catch (e) { }
      const request = `${lnUrlObject.callback}?k1=${lnUrlObject.k1}&remoteid=${localPubkey}&private=1`;

      const result = await fetch(request);
      log.v(JSON.stringify(result));

      let response: ILNUrlChannelRequestResponse | ILNUrlError;
      try {
        response = await result.json();
      } catch (e) {
        log.d("", [e]);
        throw new Error("Unable to parse message from the server");
      }
      log.d("response", [response]);

      if (isLNUrlPayResponseError(response)) {
        throw new Error(response.reason);
      }
      return true;
    }
    else {
      throw new Error("Requirements not satisfied, type must be channelRequest and lnUrlObject must be set");
    }
  }),

  doAuthRequest: thunk(async (_, _2, { getStoreState, getState, injections }) => {
    const type = getState().type;
    const lnUrlStr = getState().lnUrlStr;
    const lnUrlObject = getState().lnUrlObject;

    if (lnUrlStr && type === "login" && lnUrlObject && lnUrlObject.tag === "login") {
      log.i("Processing login");
      while (!getStoreState().lightning.nodeInfo) {
        log.i("nodeInfo is not available yet, sleeping for 1000ms");
        await timeout(1000);
      }

      // 1. The following canonical phrase is defined: [...].
      const LNURLAUTH_CANONICAL_PHRASE = "DO NOT EVER SIGN THIS TEXT WITH YOUR PRIVATE KEYS! IT IS ONLY USED FOR DERIVATION OF LNURL-AUTH HASHING-KEY, DISCLOSING ITS SIGNATURE WILL COMPROMISE YOUR LNURL-AUTH IDENTITY AND MAY LEAD TO LOSS OF FUNDS!";
      // 2. LN WALLET obtains an RFC6979 deterministic signature of sha256(utf8ToBytes(canonical phrase)) using secp256k1 with node private key.
      const signature = await injections.lndMobile.wallet.signMessageNodePubkey(stringToUint8Array(LNURLAUTH_CANONICAL_PHRASE));
      // 3. LN WALLET defines hashingKey as PrivateKey(sha256(obtained signature)).
      const hashingKey = new sha256Hash().update(stringToUint8Array(signature.signature)).digest();
      // 4. SERVICE domain name is extracted from auth LNURL and then service-specific linkingPrivKey is defined as PrivateKey(hmacSha256(hashingKey, service domain name)).
      const domain = getDomainFromURL(lnUrlStr);
      const linkingKeyPriv = new sha256HMAC(hashingKey).update(stringToUint8Array(domain)).digest();

      // Obtain the public key
      const linkingKeyPub = secp256k1.publicKeyCreate(linkingKeyPriv, true);

      // Sign the message
      const signedMessage = secp256k1.ecdsaSign(hexToUint8Array(lnUrlObject.k1), linkingKeyPriv);
      const signedMessageDER = secp256k1.signatureExport(signedMessage.signature)

      //    LN WALLET Then issues a GET to LN SERVICE using
      //    <LNURL_hostname_and_path>?<LNURL_existing_query_parameters>&sig=<hex(sign(k1.toByteArray, linkingPrivKey))>&key=<hex(linkingKey)>
      const url = (
        lnUrlStr +
        `&sig=${bytesToHexString(signedMessageDER)}` +
        `&key=${bytesToHexString(linkingKeyPub)}`
      );
      log.d("url", [url]);
      // 4 omitted
      const result = await fetch(url);
      log.d("result", [JSON.stringify(result)]);

      let response: ILNUrlAuthResponse | ILNUrlError;
      try {
        response = await result.json();
      } catch (e) {
        log.d("", [e]);
        throw new Error("Unable to parse message from the server");
      }
      log.d("response", [response]);

      if (isLNUrlPayResponseError(response)) {
        throw new Error(response.reason);
      }

      return true;
    }
    else {
      throw new Error("Requirements not satisfied, type must be login and lnUrlObject must be set");
    }
  }),

  doWithdrawRequest: thunk(async (_, { satoshi }, { getStoreActions, getStoreState, getState, injections }) => {
    const type = getState().type;
    const lnUrlStr = getState().lnUrlStr;
    const lnUrlObject = getState().lnUrlObject;

    const dunderEnabled = getStoreState().settings.dunderEnabled;

    if (dunderEnabled) {
      await getStoreActions().blixtLsp.ondemandChannel.checkOndemandChannelService();
    }
    const shouldUseDunder =
      dunderEnabled &&
      getStoreState().blixtLsp.ondemandChannel.serviceActive &&
      (
        getStoreState().lightning.rpcReady && getStoreState().channel.channels.length === 0 ||
        getStoreState().channel.remoteBalance.toSigned().subtract(5000).lessThan(satoshi) // Not perfect...
      );

    if (lnUrlStr && type === "withdrawRequest" && lnUrlObject && lnUrlObject.tag === "withdrawRequest") {
      const promise = new Promise<boolean>(async (resolve, reject) => {
        if (shouldUseDunder) {
          await getStoreActions().blixtLsp.ondemandChannel.connectToService(); // TODO check if it worked
          const serviceStatus = await getStoreActions().blixtLsp.ondemandChannel.serviceStatus();
          const result = await dunderPrompt(
            serviceStatus.approxFeeSat,
            getStoreState().settings.bitcoinUnit,
            getStoreState().fiat.currentRate,
            getStoreState().settings.fiatUnit,
          );
          if (!result) {
            return resolve(false);
          }

          try {
            await getStoreActions().blixtLsp.ondemandChannel.addInvoice({
              sat: satoshi,
              description: lnUrlObject.defaultDescription,
            });
          } catch (error) {
            Alert.alert("Error", error.message);
            resolve(false);
          }
        } else {
          const r = getStoreActions().receive.addInvoice({
            description: lnUrlObject.defaultDescription,
            sat: satoshi,
            tmpData: {
              website: getDomainFromURL(lnUrlStr),
              type: "LNURL",
              payer: null,
            }
          });
        }

        // 5. Once accepted by the user, LN WALLET sends a GET to LN SERVICE in the form of <callback>?k1=<k1>&pr=<lightning invoice, ...>
        const listener = LndMobileEventEmitter.addListener("SubscribeInvoices", async (e) => {
          try {
            log.d("SubscribeInvoices event", [e]);
            listener.remove();
            const error = checkLndStreamErrorResponse("SubscribeInvoices", e);
            if (error === "EOF") {
              return;
            } else if (error) {
              log.d("Got error from SubscribeInvoices", [error]);
              return;
            }

            const invoice = injections.lndMobile.wallet.decodeInvoiceResult(e.data);
            let firstSeparator = lnUrlObject.callback.includes("?") ? "&" : "?";
            const url = `${lnUrlObject.callback}${firstSeparator}k1=${lnUrlObject.k1}&pr=${invoice.paymentRequest}`;
            log.d("url", [url]);

            const result = await fetch(url);
            log.d("result", [JSON.stringify(result)]);

            let response: ILNUrlWithdrawResponse | ILNUrlError;
            try {
              response = await result.json();
            } catch (e) {
              log.d("", [e]);
              return reject(new Error("Unable to parse message from the server"));
            }
            log.d("response", [response]);

            if (isLNUrlPayResponseError(response)) {
              return reject(new Error(response.reason));
            }

            resolve(true);
          } catch (error) {
            reject(new Error(error.message));
          }
        });
      })

      return promise;
    }
    else {
      throw new Error("Requirements not satisfied, type must be login and lnUrlObject must be set");
    }
  }),

  doPayRequest: thunk(async (actions, payload, { getStoreActions, getState }) => {
    const type = getState().type;
    const lnUrlStr = getState().lnUrlStr;
    const lnUrlObject = getState().lnUrlObject;

    if (lnUrlStr && type === "payRequest" && lnUrlObject && lnUrlObject.tag === "payRequest") {
      // 5. LN WALLET makes a GET request using
      // <callback>?amount=<milliSatoshi>&fromnodes=<nodeId1,nodeId2,...>
      // (we're skipping fromnodes)
      const gotPayerData = !!payload.payerData;

      let callback = lnUrlObject.callback;
      let firstSeparator = lnUrlObject.callback.includes("?") ? "&" : "?";
      callback = `${callback}${firstSeparator}amount=${payload.msat.toString()}`;
      if (payload.comment) {
        callback = `${callback}&comment=${encodeURIComponent(payload.comment)}`;
      }
      if (payload.payerData) {
        callback = `${callback}&payerdata=${encodeURIComponent(JSON.stringify(payload.payerData))}`
      }
      log.d("callback" ,[callback]);

      const result = await fetch(callback);
      log.d("result", [JSON.stringify(result)]);

      let response: ILNUrlPayResponse | ILNUrlPayResponseError;
      try {
        response = await result.json();
      } catch (e) {
        log.d("", [e]);
        throw new Error("Unable to parse message from the server.");
      }
      log.d("response", [response]);

      if (isLNUrlPayResponseError(response)) {
        throw new Error(response.reason);
      }

      // 6. omitted

      if (!response.pr || response.pr.length === 0) {
        throw new Error("Response from the server did not contain an invoice.");
      }

      try {
        log.d("pr", [response.pr]);
        const paymentRequest: lnrpc.PayReq = await getStoreActions().send.setPayment({
          paymentRequestStr: response.pr,
          extraData: {
            lnurlPayResponse: response,
            payer: null,
            type: "LNURL",
            website: getDomainFromURL(lnUrlStr),
            lightningAddress: payload.lightningAddress,
            lud16IdentifierMimeType: payload.lud16IdentifierMimeType,
            lnurlPayTextPlain: payload.metadataTextPlain,
          },
        });

        // 7. LN WALLET Verifies that h tag in provided invoice is a
        //    hash of metadata string converted to byte array in UTF-8 encoding.
        const descriptionHash = paymentRequest.descriptionHash;
        if (!descriptionHash) {
          log.d("", [descriptionHash]);
          throw new Error("Invoice invalid. Description hash is missing.");
        }

        let dataToHash = lnUrlObject.metadata;
        if (gotPayerData) {
          dataToHash = `${dataToHash}${JSON.stringify(payload.payerData)}`;
        }

        const hashedMetadata = await JSHash(dataToHash, CONSTANTS.HashAlgorithms.sha256);
        if (hashedMetadata !== descriptionHash) {
          log.i("Description hash does not match metdata hash!", [hashedMetadata, descriptionHash]);
          throw new Error("Invoice description hash is invalid.");
        }

        // 8. LN WALLET Verifies that amount in provided invoice equals an amount previously specified by user.
        if (paymentRequest.numMsat.notEquals(payload.msat)) {
          throw new Error("Received invoice does not match decided cost");
        }

        // 9. If routes array is not empty: verifies signature for every provided ChannelUpdate, may use these routes if fee levels are acceptable.
        // TODO...

        // 10. ommitted

        // 11. LN WALLET pays the invoice, no additional user confirmation is required at this point.
        // Jumping back to component:
        actions.setPayRequestResponse(response);
        return response;
      } catch (e) {
        log.i("Error setting invoice to send subsystem", [e]);
        throw e;
      }
    }
    else {
      throw new Error("Requirements not satisfied, type must be login and lnUrlObject must be set");
    }
  }),

  setLNUrlStr: action((state, payload) => { state.lnUrlStr = payload }),
  setType: action((state, payload) => { state.type = payload }),
  setLNUrlObject: action((state, payload) => { state.lnUrlObject = payload }),
  setPayRequestResponse: action((state, payload) => { state.payRequestResponse = payload }),

  clear: action((state) => {
    state.lnUrlStr = undefined;
    state.type = undefined;
    state.lnUrlObject = undefined;
    state.payRequestResponse = undefined;
  }),

  resolveLightningAddress: thunk(async (actions, lightningAddress) => {
    actions.clear();
    // https://github.com/fiatjaf/lnurl-rfc/blob/luds/16.md
    // The idea here is that a SERVICE can offer human-readable addresses for users or specific internal endpoints
    // that use the format <username>@<domainname>, e.g. satoshi@bitcoin.org. A user can then type these on a WALLET.
    //
    // Upon seeing such an address, WALLET makes a GET request to
    // https://<domain>/.well-known/lnurlp/<username> endpoint if domain is clearnet or http://<domain>/.well-known/lnurlp/<name> if domain is onion.
    // For example, if the address is satoshi@bitcoin.org, the request is to be made to https://bitcoin.org/.well-known/lnurlp/satoshi.
    const [username, domain] = lightningAddress.toLowerCase().split("@");
    if (domain == undefined) {
      throw new Error("Invalid Lightning Address");
    }

    // Normal LNURL fetch request follows:
    const lnurlPayUrl = `http://${domain}/.well-known/lnurlp/${username}`;
    actions.setLNUrlStr(lnurlPayUrl);
    const result = await fetch(lnurlPayUrl);

    let lnurlObject: ILNUrlPayRequest | ILNUrlPayResponseError;
    try {
      const lnurlText = await result.text();
      log.i("",[lnurlText]);
      lnurlObject = JSON.parse(lnurlText);
    } catch (e) {
      throw new Error("Unable to parse message from the server: " + e.message);
    }
    log.d("response", [lnurlObject]);

    if (isLNUrlPayResponseError(lnurlObject)) {
      log.e("Got error");
      throw new Error(lnurlObject.reason);
    }

    log.v(JSON.stringify(lnurlObject));
    if (lnurlObject.tag === "payRequest") {
      actions.setType("payRequest");
      actions.setLNUrlObject(lnurlObject);
      return true;
    }
    return false;
  }),

  lnUrlStr: undefined,
  type: undefined,
  lnUrlObject: undefined,
  payRequestResponse: undefined,
};

const parseQueryParams = (url: string) => {
  const params: { [key: string]: string } = {};

  const firstQ = url.indexOf("?");
  if (firstQ === -1) {
    return params;
  }

  const queryParams = url.substring(firstQ + 1);
  if (queryParams.length === 0) {
    return params;
  }

  const ampSplit = queryParams.split("&");
  for (const section of ampSplit) {
    const [key, value] = section.split("=");
    params[key] = value;
  }

  return params;
};

const tryLNURLType = (subject: string): subject is LNURLType => {
  return (
    subject === "channelRequest" ||
    subject === "login"
  );
}

const isLNUrlPayResponseError = (subject: any): subject is ILNUrlPayResponseError => {
  return (
    typeof subject === "object" &&
    subject.status && subject.status === "ERROR"
  );
}

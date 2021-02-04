import { Action, action, Thunk, thunk } from "easy-peasy";
import * as Bech32 from "bech32";
import { Hash as sha256Hash, HMAC as sha256HMAC } from "fast-sha256";
import secp256k1 from "secp256k1";

import { IStoreModel } from "./index";
import { IStoreInjections } from "./store";
import { timeout, bytesToString, getDomainFromURL, stringToUint8Array, hexToUint8Array, bytesToHexString } from "../utils/index";

import Long from "long";
import { lnrpc } from "../../proto/proto";
import { deriveKey, signMessage } from "../lndmobile/wallet";
import { LndMobileEventEmitter } from "../utils/event-listener";

import logger from "./../utils/log";
const log = logger("LNURL");

export type LNURLType = "channelRequest" | "login" | "withdrawRequest" | "payRequest" | "unknown" | "error" | "unsupported";

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
  tag: "withdrawRequest";
}

export interface ILNUrlWithdrawResponse {
  status: "OK" | "ERROR";
  reason?: string;
}

export interface ILNUrlPayRequest {
  callback: string;
  maxSendable: number;
  minSendable: number;
  metadata: string;
  commentAllowed?: number;
  tag: "payRequest";
}

export type ILNUrlPayRequestMetadata = string[][];

export interface ILNUrlPayResponse {
  pr: string;
  successAction:
    | ILNUrlPayResponseSuccessActionAes
    | ILNUrlPayResponseSuccessActionMessage
    | ILNUrlPayResponseSuccessActionUrl
    | null;
  disposable: boolean | null;
  routes:	any[]; // NOT SUPPORTED
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

export type IDoPayRequestResponse = ILNUrlPayResponse;

type LNUrlRequest = ILNUrlChannelRequest | ILNUrlAuthRequest | ILNUrlWithdrawRequest | ILNUrlPayRequest | ILNUrlDummy;

export interface ILNUrlModel {
  setLNUrl: Thunk<ILNUrlModel, string, any, IStoreModel, Promise<LNURLType>>;

  doChannelRequest: Thunk<ILNUrlModel, IDoChannelRequestPayload, IStoreInjections, IStoreModel, Promise<boolean>>;
  doAuthRequest: Thunk<ILNUrlModel, void, IStoreInjections, IStoreModel, Promise<boolean>>;
  doWithdrawRequest: Thunk<ILNUrlModel, { satoshi: number; }, IStoreInjections, IStoreModel, Promise<boolean>>;
  doPayRequest: Thunk<ILNUrlModel, { msat: number, comment?: string }, IStoreInjections, IStoreModel, Promise<IDoPayRequestResponse>>;

  setLNUrlStr: Action<ILNUrlModel, string>;
  setType: Action<ILNUrlModel, LNURLType>;
  setLNUrlObject: Action<ILNUrlModel, LNUrlRequest>;

  lnUrlStr?: string;
  type?: LNURLType;
  lnUrlObject: LNUrlRequest | undefined;

  clear: Action<ILNUrlModel>;
};

export const lnUrl: ILNUrlModel = {
  setLNUrl: thunk(async (actions, bech32data) => {
    log.i("setLNUrl");
    actions.clear();
    try {
      let type: LNURLType;
      const decodedBech32 = Bech32.decode(bech32data, 1024);
      const decodedUrl = bytesToString(Bech32.fromWords(decodedBech32.words));
      log.d("decodedUrl", [decodedUrl]);
      actions.setLNUrlStr(decodedUrl);

      const queryParams = parseQueryParams(decodedUrl);
      log.d("queryParams", [queryParams]);
      // If the data is in the URL
      if ("tag" in queryParams) {
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
        log.d(`GET ${decodedUrl}, looking for tag`);
        const result = await fetch(decodedUrl);

        if (!result.ok) {
          log.d("Not ok");
          const text = await result.text();
          log.d(text);
          throw new Error(text);
        }

        log.v(JSON.stringify(result));
        const lnurlObject: LNUrlRequest = await result.json();
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
      log.e("Error reading LNURL", [e]);
      return "error";
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
      const response: ILNUrlChannelRequestResponse = await result.json();
      log.v(JSON.stringify(response));

      if (response.status === "OK") {
        return true;
      }
      throw new Error(response.reason!);
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

      // FOLLOWS THE LNURL-AUTH SPECIFICATION
      // https://github.com/btcontract/lnurl-rfc/blob/master/lnurl-auth.md
      // Key derivation for Bitcoin wallets:
      // 1. There exists a private hashingKey which is derived by user LN WALLET using m/138'/0 path.
      const hashingKey = await injections.lndMobile.wallet.derivePrivateKey(138, 0);
      // const hashingKeyPub = await injections.lndMobile.wallet.deriveKey(138, 0);
      // 2. LN SERVICE domain name is extracted from login LNURL and then hashed using hmacSha256(hashingKey, service domain name).
      const domain = getDomainFromURL(lnUrlStr);
      const hmac = new sha256HMAC(hashingKey.rawKeyBytes);
      const derivationMaterial = hmac.update(stringToUint8Array(domain)).digest();
      // 3. First 16 bytes are taken from resulting hash and then turned into a sequence of 4 Long values which are in turn used
      //    to derive a service-specific linkingKey using m/138'/<long1>/<long2>/<long3>/<long4> path
      // ?? walletrpc.DerviceKey does not allow deriving from such specific path
      // LN WALLET may choose to use a different derivation scheme but doing so will make it unportable.
      // That is, users won't be able to switch to a different wallet and keep using a service bound to existing linkingKey.
      // We cannot derive the correct key in lnd so we are taking the 4 first bytes from the derivationMaterial
      // and using that instead
      const first4 = derivationMaterial.slice(0, 4);
      const keyIndex = Long.fromBytesBE(first4 as unknown as number[], true).toNumber();
      const linkingKey = await injections.lndMobile.wallet.derivePrivateKey(138, keyIndex);
      log.d("key derived from family and index", [linkingKey.rawKeyBytes, 138, keyIndex]);

      // Wallet to service interaction flow:
      // 1, 2 omitted
      // 3. Once accepted, user LN WALLET signs k1 on secp256k1 using linkingPrivKey and DER-encodes the signature.
      const signedMessage = secp256k1.ecdsaSign(hexToUint8Array(lnUrlObject.k1), linkingKey.rawKeyBytes);
      const signedMessageDER = secp256k1.signatureExport(signedMessage.signature);
      const linkingKeyPub = secp256k1.publicKeyCreate(linkingKey.rawKeyBytes, true);

      // const signedMessageDER = (await signMessage(138, keyIndex, hexToUint8Array(lnUrlObject.k1))).signature;
      // const linkingKeyPub = (await deriveKey(138, keyIndex)).rawKeyBytes;
      // log.d("signedMessageDER", [signedMessageDER]);
      // log.d("linkingKeyPub", [linkingKeyPub]);

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
      let response: ILNUrlAuthResponse;
      try {
        response = await result.json();
      } catch (e) {
        log.d("", [e]);
        throw new Error("Unable to parse message from the server");
      }
      log.d("response", [response]);

      if (response.status === "OK") {
        return true;
      }
      throw new Error(response.reason!);
    }
    else {
      throw new Error("Requirements not satisfied, type must be login and lnUrlObject must be set");
    }
  }),

  doWithdrawRequest: thunk(async (_, { satoshi }, { getStoreActions, getState, injections }) => {
    const type = getState().type;
    const lnUrlStr = getState().lnUrlStr;
    const lnUrlObject = getState().lnUrlObject;

    if (lnUrlStr && type === "withdrawRequest" && lnUrlObject && lnUrlObject.tag === "withdrawRequest") {
      // 5. Once accepted by the user, LN WALLET sends a GET to LN SERVICE in the form of <callback>?k1=<k1>&pr=<lightning invoice, ...>
      const listener = LndMobileEventEmitter.addListener("SubscribeInvoices", async (e) => {
        log.d("SubscribeInvoices event", [e]);
        listener.remove();

        const invoice = injections.lndMobile.wallet.decodeInvoiceResult(e.data);

        const url = `${lnUrlObject.callback}?k1=${lnUrlObject.k1}&pr=${invoice.paymentRequest}`;
        log.d("url", [url]);
        const result = await fetch(url);
        log.d("result", [JSON.stringify(result)]);
        let response: ILNUrlWithdrawResponse;
        try {
          response = await result.json();
        } catch (e) {
          log.d("", [e]);
          throw new Error("Unable to parse message from the server");
        }
        log.d("response", [response]);

        if (response.status === "OK") {
          return true;
        }
        throw new Error(response.reason!);
      });

      const r = await getStoreActions().receive.addInvoice({
        description: lnUrlObject.defaultDescription,
        sat: satoshi,
        tmpData: {
          website: getDomainFromURL(lnUrlStr),
          type: "LNURL",
          payer: null,
        }
      });
      log.d("r", [r]);
      return true;
    }
    else {
      throw new Error("Requirements not satisfied, type must be login and lnUrlObject must be set");
    }
  }),

  doPayRequest: thunk(async (_, payload, { getStoreActions, getState }) => {
    const type = getState().type;
    const lnUrlStr = getState().lnUrlStr;
    const lnUrlObject = getState().lnUrlObject;

    if (lnUrlStr && type === "payRequest" && lnUrlObject && lnUrlObject.tag === "payRequest") {
      // 5. LN WALLET makes a GET request using
      // <callback>?amount=<milliSatoshi>&fromnodes=<nodeId1,nodeId2,...>
      // (we're skipping fromnodes)
      const url = new URL(lnUrlObject.callback);
      url.searchParams.append("amount", payload.msat.toString());
      if (payload.comment) {
        url.searchParams.append("comment", payload.comment)
      }

      const result = await fetch(url.href);
      log.d("result", [JSON.stringify(result)]);
      if (!result.ok) {
        let error;
        try {
          error = await result.json();
        } catch {
          log.i("error", [result]);
          throw new Error("Could not pay");
        }
        throw new Error(error.reason ?? "Could not pay");
      }
      let response: ILNUrlPayResponse | ILNUrlPayResponseError;
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

      // 6. omitted

      try {
        const paymentRequest: lnrpc.PayReq = await getStoreActions().send.setPayment({
          paymentRequestStr: response.pr,
          extraData: {
            lnurlPayResponse: response,
            payer: null,
            type: "LNURL",
            website: getDomainFromURL(lnUrlStr),
          },
        });

        // 7. LN WALLET Verifies that h tag in provided invoice is a
        //    hash of metadata string converted to byte array in UTF-8 encoding.
        const descriptionHash = paymentRequest.descriptionHash;
        if (!descriptionHash) {
          console.log(descriptionHash);
          throw new Error("Invoice invalid. Description hash is missing.");
        }

        log.d("metadata", [lnUrlObject.metadata]);
        log.d("Check match", [
          descriptionHash,
          bytesToHexString(new sha256Hash().update(stringToUint8Array(lnUrlObject.metadata)).digest()),
        ]);

        // 8. LN WALLET Verifies that amount in provided invoice equals an amount previously specified by user.
        if (paymentRequest.numMsat.notEquals(payload.msat)) {
          throw new Error("Received invoice does not match decided cost");
        }

        // 9. If routes array is not empty: verifies signature for every provided ChannelUpdate, may use these routes if fee levels are acceptable.
        // TODO...

        // 10. ommitted

        // 11. LN WALLET pays the invoice, no additional user confirmation is required at this point.
        // Jumping back to component:
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

  clear: action((state) => {
    state.lnUrlStr = undefined;
    state.type = undefined;
    state.lnUrlObject = undefined;
  }),

  lnUrlStr: undefined,
  type: undefined,
  lnUrlObject: undefined,
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

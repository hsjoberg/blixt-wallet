//
// Sorry for the condition in this file.
// Reach out to me on Telegram @hsjoberg or lnurl mafia group https://t.me/lnurl if you have any questions.
//
import { Action, action, Thunk, thunk } from "easy-peasy";
import * as Bech32 from "bech32";
import { Hash as sha256Hash, HMAC as sha256HMAC } from "fast-sha256";
import secp256k1 from "secp256k1";

import { IStoreModel } from "./index";
import { IStoreInjections } from "./store";
import { timeout, bytesToString, getDomainFromURL, stringToUint8Array, hexToUint8Array, bytesToHexString } from "../utils/index";

import { lnrpc } from "../../proto/proto";
import { LndMobileEventEmitter } from "../utils/event-listener";

import logger from "./../utils/log";
const log = logger("LNURL");

export type LNURLType = "channelRequest" | "login" | "withdrawRequest" | "payRequest" | "unknown" | "error" | "unsupported";

export type LightningAddress = string;

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

export type ILNUrlPayRequestMetadata = [string, string][];

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

const LNURLAUTH_CANONICAL_PHRASE = "DO NOT EVER SIGN THIS TEXT WITH YOUR PRIVATE KEYS! IT IS ONLY USED FOR DERIVATION OF LNURL-AUTH HASHING-KEY, DISCLOSING ITS SIGNATURE WILL COMPROMISE YOUR LNURL-AUTH IDENTITY AND MAY LEAD TO LOSS OF FUNDS!";

export interface ILNUrlModel {
  setLNUrl: Thunk<ILNUrlModel, { bech32data?: string; url?: string }, any, IStoreModel, Promise<LNURLType>>;

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

  resolveLightningAddress: Thunk<ILNUrlModel, LightningAddress>;
};

export const lnUrl: ILNUrlModel = {
  setLNUrl: thunk(async (actions, { bech32data, url }) => {
    log.i("setLNUrl");
    actions.clear();
    try {
      let type: LNURLType;
      if (bech32data) {
        const decodedBech32 = Bech32.bech32.decode(bech32data, 1024);
        url = bytesToString(Bech32.bech32.fromWords(decodedBech32.words));
      } else if (!url) {
        throw new Error("Neither bech32data or url is provided");
      }
      log.d("url", [url]);
      actions.setLNUrlStr(url);

      const queryParams = parseQueryParams(url);
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
        log.d(`GET ${url}, looking for tag`);
        const result = await fetch(url);

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

      // 1. The following canonical phrase is defined: [...].
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
      throw new Error(response.reason! ?? "Invalid response: " + JSON.stringify(response));
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
      let callback = lnUrlObject.callback;
      let firstSeparator = lnUrlObject.callback.includes("?") ? "&" : "?"
      callback = `${callback}${firstSeparator}amount=${payload.msat.toString()}`;
      if (payload.comment) {
        callback = `${callback}&comment=${payload.comment}`;
      }

      const result = await fetch(callback);
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

    const lnurlObject: LNUrlRequest | ILNUrlPayResponseError = await result.json();

    if (isLNUrlPayResponseError(lnurlObject)) {
      log.e("Got error")
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

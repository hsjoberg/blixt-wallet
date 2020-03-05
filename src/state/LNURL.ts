import { Action, action, Thunk, thunk, computed, Computed } from "easy-peasy";
import * as Bech32 from "bech32";

import { IStoreModel } from "./index";
import { IStoreInjections } from "./store";
import { timeout, bytesToString } from "../utils/index";

import logger from "./../utils/log";
const log = logger("LNURL");

export type LNURLType = "channelRequest" | "unknown" | "error" | "unsupported";

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

export interface ILNUrlDummy {
	tag: "X";
}

export interface IDoChannelRequestPayload {
  private: true;
}

export interface ILNUrlModel {
  setLNUrl: Thunk<ILNUrlModel, string, any, IStoreModel, Promise<LNURLType>>;

  doChannelRequest: Thunk<ILNUrlModel, IDoChannelRequestPayload, IStoreInjections, IStoreModel, Promise<boolean>>;

  setLNUrlStr: Action<ILNUrlModel, string>;
  setType: Action<ILNUrlModel, LNURLType>;
  setLNUrlObject: Action<ILNUrlModel, ILNUrlChannelRequest | ILNUrlDummy>;

  lnUrlStr?: string;
  type?: LNURLType;
  lnUrlObject: ILNUrlChannelRequest | ILNUrlDummy | undefined

  clear: Action<ILNUrlModel>;
};

export const lnUrl: ILNUrlModel = {
  setLNUrl: thunk(async (actions, bech32data) => {
    actions.clear();
    try {
      const decodedBech32 = Bech32.decode(bech32data, 1024);
      const decodedUrl = bytesToString(Bech32.fromWords(decodedBech32.words));
      log.d(decodedUrl);
      let type: LNURLType;
      const result = await fetch(decodedUrl);
      log.v(JSON.stringify(result));
      const lnurlObject: ILNUrlChannelRequest | ILNUrlDummy = await result.json();
      log.v(JSON.stringify(lnurlObject));
      if (lnurlObject.tag === "channelRequest") {
        type = "channelRequest";
      }
      else {
        throw "unknown";
      }

      actions.setLNUrlStr(decodedUrl);
      actions.setType(type);
      actions.setLNUrlObject(lnurlObject);
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
      while (!getStoreState().lightning.nodeInfo) {
        log.i("nodeInfo is not available yet, sleeping for 1000ms");
        await timeout(1000);
      }
      const localPubkey = getStoreState().lightning.nodeInfo!.identityPubkey;
      const [pubkey, host] = lnUrlObject.uri.split("@");
      try {
        await connectPeer(pubkey, host);
      } catch (e) {}
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

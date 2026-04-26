import { AppState, AppStateStatus, Linking } from "react-native"
import { Action, action, Thunk, thunk } from "easy-peasy";
import { NavigationContainerRef } from "@react-navigation/native";

import { getNavigator } from "../utils/navigation";
import { IStoreModel } from "./index";
import { waitUntilTrue } from "../utils";
import { LnBech32Prefix } from "../utils/build";
import { PLATFORM } from "../utils/constants";
import NativeBlixtTools from "../turbomodules/NativeBlixtTools";

import logger from "./../utils/log";
const log = logger("DeeplinkManager");

export interface IDeeplinkManager {
  initialize: Thunk<IDeeplinkManager>;
  setupAppStateChangeListener: Thunk<IDeeplinkManager, void, any, IStoreModel>;

  checkDeeplink: Thunk<IDeeplinkManager, string | undefined | null, any, IStoreModel>;
  tryInvoice: Thunk<IDeeplinkManager, { paymentRequest: string }, any, IStoreModel>;
  tryLNUrl: Thunk<IDeeplinkManager, { bech32data?: string; url?: string }, any, IStoreModel>;
  addToCache: Action<IDeeplinkManager, string>;

  cache: string[];
}

export const deeplinkManager: IDeeplinkManager = {
  initialize: thunk((actions) => {
    actions.setupAppStateChangeListener();
    // Used for checking for URL intent invocations
    if (["android", "ios", "macos"].includes(PLATFORM)) {
      Linking.addListener("url", async (e: { url: string }) => {
        log.i("url eventlistener", [e]);
        const result = await actions.checkDeeplink(e.url);
        console.log(result);
        if (result) {
          result(getNavigator());
        }
      });
    }
  }),

  setupAppStateChangeListener: thunk((actions) => {
    // Used for checking common intent invocations ("Share with app", NFC etc)
    AppState.addEventListener("change", async (status: AppStateStatus) => {
      log.i("New app state found");
      if (status === "active") {
        log.i("Checking deeplink");
        const result = await actions.checkDeeplink();
        if (result) {
          result(getNavigator());
        }
      }
    });
  }),

  checkDeeplink: thunk(async (actions, data, { getState, getStoreState }) => {
    try {
      if (data === undefined || data === null) {
        data = await Linking.getInitialURL();
      }
      if (PLATFORM === "android") {
        if (data === null) {
          data = await NativeBlixtTools.getIntentStringData();
        }
        if (data === null) {
          data = await NativeBlixtTools.getIntentNfcData();
        }
      }
      log.d("Deeplink", [data]);
      if (data) {
        // Waiting for RPC server to be ready
        await waitUntilTrue(() => getStoreState().lightning.rpcReady);

        if (getState().cache.includes(data)) {
          return;
        }
        actions.addToCache(data);

        for (let subject of data.split(/\s/)) {
          try {
            subject = subject.toLowerCase().replace("lightning:", "");
            subject = subject.replace("blixtwallet:", "");
            log.d("Testing", [subject]);

            // If this is an invoice
            if (subject.startsWith(LnBech32Prefix)) {
              return await actions.tryInvoice({ paymentRequest: subject.split("?")[0] });
            }
            // If this is a non-bech32 LNURL (LUD-17)
            else if (subject.startsWith("lnurlp://") || subject.startsWith("lnurlw://") || subject.startsWith("lnurlc://")) {
              subject = "https://" + subject.substring(9);
              return await actions.tryLNUrl({ url: subject.split("?")[0] });
            }
            else if (subject.startsWith("keyauth://")) {
              subject = "https://" + subject.substring(10);
              return await actions.tryLNUrl({ url: subject.split("?")[0] });
            }
            // If this is an LNURL
            else if (subject.startsWith("lnurl")) {
              return await actions.tryLNUrl({ bech32data: subject.split("?")[0] });
            }
            else if (subject.includes("@")) {
              const hexRegex = /^[0-9a-fA-F]+$/;
              const pubkey = subject.split("@")[0];
              if (hexRegex.test(pubkey)) {
                log.i("Looks like a lightning peer URI", [subject]);
                return (nav: NavigationContainerRef) => {
                  nav?.navigate("LightningInfo", { screen: "OpenChannel", params: { peerUri: data } });
                }
              }
            }
            // If this is a normal URL
            // we want to open the WebLN browser
            else {
              try {
                if (subject.startsWith("https")) {
                  if (PLATFORM === "web") {
                    return null;
                  }
                  const url = new URL(subject);
                  return (nav: NavigationContainerRef) => {
                    nav?.navigate("WebLNBrowser", { url: subject });
                  }
                }
              } catch (e) { }
            }
          } catch (e) {
            log.i(`Error checking deeplink subject: ${e.message}`);
          }
        }
      }
    } catch (e) {
      log.i(`Error checking deeplink: ${e.message}`);
    }
    return null;
  }),

  tryInvoice: thunk(async (_, payload, { dispatch }) => {
    try {
      await dispatch.send.setPayment({ paymentRequestStr: payload.paymentRequest });
      return (nav: NavigationContainerRef) => {
        nav?.navigate("Send", { screen: "SendConfirmation" });
      }
    } catch (e) {
      dispatch.send.clear();
      log.i(`Error checking deeplink invoice: ${e.message}`);
    }
    return false;
  }),

  tryLNUrl: thunk(async (_, payload, { dispatch }) => {
    const type = await dispatch.lnUrl.setLNUrl(payload);
    if (type === "channelRequest") {
      log.d("Navigating to channelRequest");
      return (nav: NavigationContainerRef) => {
        nav?.navigate("LNURL", { screen: "ChannelRequest" });
      }
    }
    else if (type === "login") {
      log.d("Navigating to authRequest");
      return (nav: NavigationContainerRef) => {
        nav?.navigate("LNURL", { screen: "AuthRequest" });
      }
    }
    else if (type === "withdrawRequest") {
      log.d("Navigating to withdrawRequest");
      return (nav: NavigationContainerRef) => {
        nav?.navigate("LNURL", { screen: "WithdrawRequest" });
      }
    }
    else if (type === "payRequest") {
      log.d("Navigating to payRequest");
      return (nav: NavigationContainerRef) => {
        nav?.navigate("LNURL", { screen: "PayRequest" });
      }
    }
    else {
      throw new Error("Unknown lnurl request");
    }
  }),

  addToCache: action((state, payload) => {
    state.cache = [...state.cache, payload];
  }),

  cache: [],
};

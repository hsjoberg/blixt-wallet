import { AppState, AppStateStatus, Linking, NativeModules } from "react-native"
import { Action, action, Thunk, thunk } from "easy-peasy";
import { NavigationContainerRef } from "@react-navigation/native";

import { getNavigator } from "../utils/navigation";
import { IStoreModel } from "./index";
import { timeout } from "../utils";
import { LnBech32Prefix } from "../utils/build";

import logger from "./../utils/log";
const log = logger("AndroidDeeplinkManager");

export interface IAndroidDeeplinkManager {
  initialize: Thunk<IAndroidDeeplinkManager>;
  setupAppStateChangeListener: Thunk<IAndroidDeeplinkManager, void, any, IStoreModel>;

  checkDeeplink: Thunk<IAndroidDeeplinkManager, void, any, IStoreModel>;
  tryInvoice: Thunk<IAndroidDeeplinkManager, { paymentRequest: string }, any, IStoreModel>;
  tryLNUrl: Thunk<IAndroidDeeplinkManager, { lnUrl: string }, any, IStoreModel>;
  addToCache: Action<IAndroidDeeplinkManager, string>;

  cache: string[];
}

export const androidDeeplinkManager: IAndroidDeeplinkManager = {
  initialize: thunk((actions) => {
    actions.setupAppStateChangeListener();
    // Used for checking for URL intent invocations
    Linking.addListener("url", async (e: { url: string }) => {
      log.i("url eventlistener");
      const result = await actions.checkDeeplink();
      console.log(result);
      if (result) {
        result(getNavigator());
      }
    });
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

  checkDeeplink: thunk(async (actions, _, { getState, getStoreState }) => {
    try {
      let data = await Linking.getInitialURL();
      if (data === null) {
        data = await NativeModules.LndMobile.getIntentStringData();
      }
      if (data === null) {
        data = await NativeModules.LndMobile.getIntentNfcData();
      }
      log.d("Deeplink", [data]);
      if (data) {
        // Waiting for RPC server to be ready
        while (!getStoreState().lightning.rpcReady) {
          await timeout(500);
        }

        if (getState().cache.includes(data)) {
          return;
        }
        actions.addToCache(data);

        for (let subject of data.split(/\s/)) {
          subject = subject.toUpperCase().replace("LIGHTNING:", "");
          log.d("Testing", [subject]);

          // If this is an invoice
          if (subject.startsWith(LnBech32Prefix.toUpperCase())) {
            return await actions.tryInvoice({ paymentRequest: subject.split("?")[0] });
          }
          // If this is an LNURL
          else if (subject.startsWith("LNURL")) {
            return await actions.tryLNUrl({ lnUrl: subject.split("?")[0] });
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
              const url = new URL(subject);
              return (nav: NavigationContainerRef) => {
                nav?.navigate("WebLNBrowser", { url: subject });
              }
            } catch (e) { }
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
    const type = await dispatch.lnUrl.setLNUrl(payload.lnUrl);
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

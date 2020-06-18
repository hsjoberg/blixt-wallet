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

  checkDeeplink: Thunk<IAndroidDeeplinkManager, void, (nav: NavigationContainerRef) => {} | null, IStoreModel>;
  tryInvoice: Thunk<IAndroidDeeplinkManager, { paymentRequest: string }, (nav: NavigationContainerRef) => {} | null, IStoreModel>;
  tryLNUrl: Thunk<IAndroidDeeplinkManager, { lnUrl: string }, (nav: NavigationContainerRef) => {} | null, IStoreModel>;
  addToCache: Action<IAndroidDeeplinkManager, string>;

  cache: string[];
}

export const androidDeeplinkManager: IAndroidDeeplinkManager = {
  initialize: thunk(async (actions) => {
    actions.setupAppStateChangeListener();
    // Used for checking for URL intent invocations
    Linking.addListener("url", async (e: { url: string }) => {
      log.d("url eventlistener");
      const result = await actions.checkDeeplink();
      console.log(result);
      if (result) {
        result(getNavigator());
      }
    });
    // await actions.checkDeeplink();
  }),

  setupAppStateChangeListener: thunk((actions, _, { getStoreState }) => {
    // Used for checking common intent invocations ("Share with app", NFC etc)
    AppState.addEventListener("change", async (status: AppStateStatus) => {
      log.d("change eventlistener");
      if (status === "active") {
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

        if (data.toUpperCase().startsWith("LIGHTNING:")) {
          log.d("Deeplink found");
          const lightningUri = data.toUpperCase().replace("LIGHTNING:", "");

          log.d("", [lightningUri.startsWith(LnBech32Prefix.toUpperCase())]);
          // If this is an invoice
          if (lightningUri.startsWith(LnBech32Prefix.toUpperCase())) {
            return await actions.tryInvoice({ paymentRequest: lightningUri });
          }
          // If this is an LNURL
          else if (lightningUri.startsWith("LNURL")) {
            return await actions.tryLNUrl({ lnUrl: lightningUri });
          }
        }
        // If this is a normal URL
        // we want to open the WebLN browser
        else {
          try {
            const url = new URL(data);
            return (nav: NavigationContainerRef) => {
              nav?.navigate("WebLNBrowser", { url: data });
            }
          } catch (e) { }
        }
      }
    } catch (e) {
      log.i(`Error checking deeplink: ${e.message}`);
    }
    return null;
  }),

  tryInvoice: thunk(async (actions, payload, { dispatch, getState }) => {
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

  tryLNUrl: thunk(async (actions, payload, { dispatch, getState }) => {
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

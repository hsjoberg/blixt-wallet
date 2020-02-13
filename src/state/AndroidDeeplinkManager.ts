import { Alert, AppState, AppStateStatus, Linking, NativeModules } from "react-native"
import { Action, action, Thunk, thunk } from "easy-peasy";
import { navigate, getNavigator, replace } from "../utils/navigation";
import { IStoreModel } from "./index";

import logger from "./../utils/log";
import { timeout } from "../utils";
const log = logger("AndroidDeeplinkManager");

export interface IAndroidDeeplinkManager {
  initialize: Thunk<IAndroidDeeplinkManager>;
  setupAppStateChangeListener: Thunk<IAndroidDeeplinkManager, void, any, IStoreModel>;

  checkDeeplink: Thunk<IAndroidDeeplinkManager, { navigate: boolean, navigation?: any }, any, IStoreModel>;
  tryInvoice: Thunk<IAndroidDeeplinkManager, { paymentRequest: string, navigate: boolean, navigation?: any }, any, IStoreModel>;
  tryUrl: Thunk<IAndroidDeeplinkManager, { url: string, navigate: boolean, navigation?: any }, any, IStoreModel>;
  addToCache: Action<IAndroidDeeplinkManager, string>;

  Cache: string[];
}

export const androidDeeplinkManager: IAndroidDeeplinkManager = {
  initialize: thunk(async (actions) => {
    actions.setupAppStateChangeListener();
    Linking.addListener("url", (e: { url: string }) => {
      actions.tryInvoice({
        paymentRequest: e.url,
        navigate: true,
      });
    });
    await actions.checkDeeplink({ navigate: true });

  }),

  setupAppStateChangeListener: thunk(async (actions, _, { getStoreState }) => {
    AppState.addEventListener("change", async (status: AppStateStatus) => {
      if (status === "active") {
        console.log("checking intent");
        await actions.checkDeeplink({ navigate: true });
      }
    });
  }),

  checkDeeplink: thunk(async (actions, payload, { dispatch, getState, getStoreState }) => {
    try {
      let data = await Linking.getInitialURL();
      if (data === null) {
        data = await NativeModules.LndMobile.getIntentStringData();
      }
      if (data === null) {
        data = await NativeModules.LndMobile.getIntentNfcData();
      }
      log.d("", [data]);
      if (data) {
        if (data.toUpperCase().startsWith("LIGHTNING:")) {
          return await actions.tryInvoice({
            ...payload,
            paymentRequest: data,
          });
        }
        // If this is a normal URL
        // we want to open the WebLN browser
        else {
          try {
            const url = new URL(data);
            navigate("WebLNBrowser", { url: data });
          } catch (e) {}
        }
      }
    } catch (e) {
      dispatch.send.clear();
      log.e(`Error checking deeplink: ${e.message}`);
    }
    return null;
  }),

  tryInvoice: thunk(async (actions, payload, { dispatch, getState, getStoreState }) => {
    if (getState().Cache.includes(payload.paymentRequest)) {
      return;
    }
    actions.addToCache(payload.paymentRequest);

    while (!getStoreState().lightning.rpcReady) {
      await timeout(500);
    }

    await dispatch.send.setPayment({ paymentRequestStr: payload.paymentRequest.toUpperCase().replace("LIGHTNING:", "") });
    if (payload.navigate) {
      return (nav) => {
        nav.navigate("Send", { screen: "SendConfirmation" });
      }
    }
    return false;
  }),

  tryUrl: thunk(async (actions, payload, { dispatch, getState, getStoreState }) => {
    if (getState().Cache.includes(payload.url)) {
      return;
    }
    actions.addToCache(payload.url);

    while (!getStoreState().lightning.rpcReady) {
      await timeout(500);
    }

    await dispatch.send.setPayment({ paymentRequestStr: payload.paymentRequest.toUpperCase().replace("LIGHTNING:", "") });
    if (payload.navigation) {
      navigate("Send", { screen: "SendConfirmation" });
    }
    return true;
  }),

  addToCache: action((state, payload) => {
    state.Cache = [...state.Cache, payload];
  }),

  Cache: [],
};

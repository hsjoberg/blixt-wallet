import { Alert, AppState, AppStateStatus, Linking, NativeModules } from "react-native"
import { Action, action, Thunk, thunk } from "easy-peasy";
import { navigate, getNavigator } from "../utils/navigation";
import { IStoreModel } from "./index";

import logger from "./../utils/log";
import { timeout } from "../utils";
const log = logger("AndroidDeeplinkManager");

export interface IAndroidDeeplinkManager {
  initialize: Thunk<IAndroidDeeplinkManager>;
  setupAppStateChangeListener: Thunk<IAndroidDeeplinkManager, void, any, IStoreModel>;

  checkDeeplink: Thunk<IAndroidDeeplinkManager, { navigate: boolean }, any, IStoreModel>;
  tryInvoice: Thunk<IAndroidDeeplinkManager, { paymentRequest: string, navigate: boolean }, any, IStoreModel>;
  addToIntentCache: Action<IAndroidDeeplinkManager, string>;

  intentCache: string[];
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
      let lightningURI = await Linking.getInitialURL();
      if (lightningURI === null) {
        lightningURI = await NativeModules.LndMobile.getIntentStringData();
      }
      if (lightningURI === null) {
        lightningURI = await NativeModules.LndMobile.getIntentNfcData();
      }
      log.d("lightningURI", [lightningURI]);
      if (lightningURI && lightningURI.toUpperCase().startsWith("LIGHTNING:")) {
        return actions.tryInvoice({
          paymentRequest: lightningURI,
          navigate: payload.navigate,
        });
      }
    } catch (e) {
      dispatch.send.clear();
      log.e(`Error checking deeplink: ${e.message}`);
    }
    return null;
  }),

  tryInvoice: thunk(async (actions, payload, { dispatch, getState, getStoreState }) => {
    if (getState().intentCache.includes(payload.paymentRequest)) {
      return;
    }
    actions.addToIntentCache(payload.paymentRequest);

    log.d("try lightningURI");

    while (!getStoreState().lightning.rpcReady) {
      await timeout(500);
    }

    await dispatch.send.setPayment({ paymentRequestStr: payload.paymentRequest.toUpperCase().replace("LIGHTNING:", "") });
    if (payload.navigate) {
      navigate("Send", { screen: "SendConfirmation" });
    }
    return true;
  }),

  addToIntentCache: action((state, payload) => {
    state.intentCache = [...state.intentCache, payload];
  }),

  intentCache: [],
};

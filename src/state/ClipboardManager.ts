import { Alert, AppState, AppStateStatus } from "react-native";
import Clipboard from "@react-native-community/clipboard";
import { Action, action, Thunk, thunk } from "easy-peasy";
import { navigate, getNavigator } from "../utils/navigation";
import { IStoreModel } from "./index";

import logger from "./../utils/log";
import { LnBech32Prefix } from "../utils/build";
const log = logger("ClipboardManager");

export interface IClipboardManagerModel {
  initialize: Thunk<IClipboardManagerModel, void, any, IStoreModel>;
  setupInvoiceListener: Thunk<IClipboardManagerModel, void, any, IStoreModel>;

  checkInvoice: Thunk<IClipboardManagerModel, string, any, IStoreModel>;
  addToInvoiceCache: Action<IClipboardManagerModel, string>;
  tryInvoice: Thunk<IClipboardManagerModel, { paymentRequest: string }, any, IStoreModel>;
  tryLNUrl: Thunk<IClipboardManagerModel, { lnUrl: string }, any, IStoreModel>;

  invoiceCache: string[];
}

export const clipboardManager: IClipboardManagerModel = {
  initialize: thunk(async (actions, _, { getStoreState }) => {
    actions.setupInvoiceListener();

    if (getStoreState().settings.clipboardInvoiceCheckEnabled) {
      const clipboardText = await Clipboard.getString();
      await actions.checkInvoice(clipboardText);
    }
  }),

  setupInvoiceListener: thunk((actions, _, { getStoreState }) => {
    AppState.addEventListener("change", async (status: AppStateStatus) => {
      if (getStoreState().settings.clipboardInvoiceCheckEnabled && status === "active") {
        const clipboardText = await Clipboard.getString();
        await actions.checkInvoice(clipboardText);
      }
    });
  }),

  checkInvoice: thunk(async (actions, text, { dispatch, getState }) => {
    const navigator = getNavigator();
    if (
      !navigator ||
      !navigator.getRootState() ||
      navigator.getRootState().routes[navigator.getRootState().routes.length-1].name === "Send"
    ) {
      log.d("Skipping clipboard check");
      return;
    }
    try {
      if (getState().invoiceCache.includes(text) || !text || text.length === 0) {
        return;
      }
      actions.addToInvoiceCache(text);

      // If this is an invoice
      if (text.startsWith(LnBech32Prefix)) {
        log.d("ln uri");
        actions.tryInvoice({ paymentRequest: text });
      }
      // If this is an LNURL
      else if (text.startsWith("LNURL")) {
        log.d("lnurl");
        actions.tryLNUrl({ lnUrl: text });
      }
    } catch (e) {
      log.d("Error checking clipboard", [e]);
    }
  }),

  tryInvoice: thunk(async (actions, payload, { dispatch, getState }) => {
    try {
      await dispatch.send.setPayment({paymentRequestStr: payload.paymentRequest });

      Alert.alert(
        "Found invoice in clipboard",
        "Found a lightning invoice in clipboard. Do you wish to pay this invoice?",
        [{
          text: "Cancel",
          onPress: () => dispatch.send.clear()
        }, {
          text: "Pay invoice",
          onPress: () => {
            navigate("Send", { screen: "SendConfirmation" });
          }
        }]
      );
    } catch (e) {
      dispatch.send.clear();
      log.e(`Error checking clipboard for lightning invoice: ${e.message}`);
    }
    return false;
  }),

  tryLNUrl: thunk(async (actions, payload, { dispatch, getState, getStoreState }) => {
    const type = await dispatch.lnUrl.setLNUrl(payload.lnUrl);
    if (type === "channelRequest") {
      Alert.alert(
        "Found LNURL in clipboard",
        `Found an LNURL in clipboard. Do you wish to continue?`,
        [{
          text: "Cancel",
          onPress: () => dispatch.lnUrl.clear()
        }, {
          text: "Continue",
          onPress: () => {
            log.d("Navigating to channelRequest");
            navigate("ChannelRequest");
          }
        }]
      );
    }
    else {
      throw new Error("Unknown lnurl request");
    }
  }),

  addToInvoiceCache: action((state, bolt11String) => {
    state.invoiceCache = [...state.invoiceCache, bolt11String];
  }),

  invoiceCache: [],
};

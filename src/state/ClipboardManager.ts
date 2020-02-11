import { Alert, Clipboard, AppState, AppStateStatus } from "react-native"
import { Action, action, Thunk, thunk } from "easy-peasy";
import { navigate, getNavigator } from "../utils/navigation";
import { IStoreModel } from "./index";

import logger from "./../utils/log";
const log = logger("ClipboardManager");

export interface IClipboardManagerModel {
  initialize: Thunk<IClipboardManagerModel, void, any, IStoreModel>;
  setupInvoiceListener: Thunk<IClipboardManagerModel, void, any, IStoreModel>;

  checkInvoice: Thunk<IClipboardManagerModel, string, any, IStoreModel>;
  addToInvoiceCache: Action<IClipboardManagerModel, string>;

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

  setupInvoiceListener: thunk(async (actions, _, { getStoreState }) => {
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

      await dispatch.send.setPayment({paymentRequestStr: text });

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
      log.d("Error checking clipboard for lightning invoice", [e]);
      dispatch.send.clear();
    }
  }),

  addToInvoiceCache: action((state, bolt11String) => {
    state.invoiceCache = [...state.invoiceCache, bolt11String];
  }),

  invoiceCache: [],
};

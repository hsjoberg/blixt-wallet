import { Alert, Clipboard, AppState, AppStateStatus } from "react-native"
import { Action, action, Thunk, thunk } from "easy-peasy";
import { navigate } from "../utils/navigation";
import { IStoreModel } from "./index";

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
          onPress: async () => dispatch.send.clear()
        }, {
          text: "Pay invoice",
          onPress: async () => {
            navigate("SendConfirmation");
          }
        }]
      );
    } catch (e) {
      console.log(e);
      dispatch.send.clear();
    }
  }),

  addToInvoiceCache: action((state, bolt11String) => {
    state.invoiceCache = [...state.invoiceCache, bolt11String];
  }),

  invoiceCache: [],
};

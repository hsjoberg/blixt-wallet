import { Alert, AppState, AppStateStatus } from "react-native";
import Clipboard from "@react-native-clipboard/clipboard";
import { Action, action, Thunk, thunk } from "easy-peasy";

import { navigate, getNavigator } from "../utils/navigation";
import { IStoreModel } from "./index";
import { LnBech32Prefix } from "../utils/build";
import { PLATFORM } from "../utils/constants";

import logger from "./../utils/log";
const log = logger("ClipboardManager");

export interface IClipboardManagerModel {
  initialize: Thunk<IClipboardManagerModel, void, any, IStoreModel>;
  setupInvoiceListener: Thunk<IClipboardManagerModel, void, any, IStoreModel>;

  checkInvoice: Thunk<IClipboardManagerModel, string, any, IStoreModel>;
  addToInvoiceCache: Action<IClipboardManagerModel, string>;
  tryInvoice: Thunk<IClipboardManagerModel, { paymentRequest: string }, any, IStoreModel>;
  tryLNUrl: Thunk<IClipboardManagerModel, { bech32data?: string; url?: string }, any, IStoreModel>;

  invoiceCache: string[];
}

export const clipboardManager: IClipboardManagerModel = {
  initialize: thunk(async (actions, _, { getStoreState }) => {
    if (["android", "ios", "macos"].includes(PLATFORM)) {
      actions.setupInvoiceListener();

      if (getStoreState().settings.clipboardInvoiceCheckEnabled) {
        const clipboardText = await Clipboard.getString();
        await actions.checkInvoice(clipboardText);
      }
    }
  }),

  setupInvoiceListener: thunk((actions, _, { getStoreState }) => {
    AppState.addEventListener("change", async (status: AppStateStatus) => {
      log.d("event", [status]);
      if (getStoreState().settings.clipboardInvoiceCheckEnabled && status === "active") {
        const clipboardText = await Clipboard.getString();
        await actions.checkInvoice(clipboardText);
      }
    });
  }),

  checkInvoice: thunk(async (actions, text, { dispatch, getState }) => {
    log.i("checkInvoice");
    const navigator = getNavigator();
    if (
      !navigator ||
      !navigator.getRootState() ||
      navigator.getRootState().routes[navigator.getRootState().routes.length - 1].name === "Send"
    ) {
      log.d("Skipping clipboard check");
      return;
    }
    try {
      if (getState().invoiceCache.includes(text) || !text || text.length === 0) {
        log.d("Invoice already in cache");
        return;
      }
      text = text.toLowerCase();
      // TODO remove lightning:
      log.i("try", [text]);
      actions.addToInvoiceCache(text);

      // If this is an invoice
      if (text.indexOf(LnBech32Prefix) !== -1) {
        log.d("ln uri");
        text = text.substring(text.indexOf(LnBech32Prefix)).split(/[\s&]/)[0];
        actions.tryInvoice({ paymentRequest: text });
      }
      // If this is a non-bech32 LNURL (LUD-17)
      else if (
        text.includes("lnurlp://") ||
        text.includes("lnurlw://") ||
        text.includes("lnurlc://")
      ) {
        log.d("lnurl non-bech32");
        text = "https://" + text.substring(9).split(/[\s&]/)[0];
        actions.tryLNUrl({ url: text });
      } else if (text.includes("keyauth://")) {
        log.d("lnurl non-bech32 keyauth");
        text = "https://" + text.substring(10).split(/[\s&]/)[0];
        actions.tryLNUrl({ url: text });
      }
      // If this is an LNURL
      else if (text.includes("lnurl")) {
        log.d("lnurl");
        text = text.substring(text.indexOf("lnurl")).split(/[\s&]/)[0];
        actions.tryLNUrl({ bech32data: text });
      }
    } catch (e) {
      log.d("Error checking clipboard", [e]);
    }
  }),

  tryInvoice: thunk(async (_, payload, { dispatch, getStoreState }) => {
    try {
      const paymentRequest = await dispatch.send.setPayment({
        paymentRequestStr: payload.paymentRequest,
      });

      if (getStoreState().lightning.nodeInfo?.identityPubkey === paymentRequest.destination) {
        log.d("Found own invoice");
        return false;
      }

      if (getStoreState().transaction.getTransactionByRHash(paymentRequest.paymentHash)) {
        log.d("Found already paid invoice");
        return false;
      }

      Alert.alert(
        "Found invoice in clipboard",
        "Found a lightning invoice in clipboard. Do you wish to pay this invoice?",
        [
          {
            text: "Cancel",
            onPress: () => dispatch.send.clear(),
          },
          {
            text: "Pay invoice",
            onPress: () => {
              navigate("Send", { screen: "SendConfirmation" });
            },
          },
        ],
      );
    } catch (e) {
      dispatch.send.clear();
      log.e(`Error checking clipboard for lightning invoice: ${e.message}`);
    }
    return false;
  }),

  tryLNUrl: thunk(async (actions, payload, { dispatch }) => {
    const type = await dispatch.lnUrl.setLNUrl(payload);
    if (type === "channelRequest") {
      Alert.alert(
        "Found LNURL channel request in clipboard",
        `Found an LNURL channel request in clipboard. Do you wish to continue?`,
        [
          {
            text: "Cancel",
            onPress: () => dispatch.lnUrl.clear(),
          },
          {
            text: "Continue",
            onPress: () => {
              log.d("Navigating to channelRequest");
              navigate("LNURL", { screen: "ChannelRequest" });
            },
          },
        ],
      );
    } else if (type === "login") {
      navigate("LNURL", { screen: "AuthRequest" });
    } else if (type === "withdrawRequest") {
      navigate("LNURL", { screen: "WithdrawRequest" });
    } else if (type === "payRequest") {
      navigate("LNURL", { screen: "PayRequest" });
    } else {
      throw new Error("Unknown lnurl request");
    }
  }),

  addToInvoiceCache: action((state, bolt11String) => {
    state.invoiceCache = [...state.invoiceCache, bolt11String];
  }),

  invoiceCache: [],
};

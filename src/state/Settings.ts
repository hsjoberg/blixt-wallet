import { Action, action, Thunk, thunk } from "easy-peasy";

import { StorageItem, getItemObject, setItemObject, removeItem, getItem, setItem } from "../storage/app";
import { IFiatRates } from "./Fiat";
import { IBitcoinUnit, IBitcoinUnits, BitcoinUnits } from "../utils/bitcoin-units";

export interface ISettingsModel {
  initialize: Thunk<ISettingsModel>;

  changeBitcoinUnit: Thunk<ISettingsModel, keyof IBitcoinUnits>;
  changeFiatUnit: Thunk<ISettingsModel, keyof IFiatRates>;
  changeName: Thunk<ISettingsModel, string | null>;
  changeAutopilotEnabled: Thunk<ISettingsModel, boolean>;
  changePushNotificationsEnabled: Thunk<ISettingsModel, boolean>;
  changeClipboardInvoiceCheckEnabled: Thunk<ISettingsModel, boolean>;
  changeScheduledSyncEnabled: Thunk<ISettingsModel, boolean>;
  changeDebugShowStartupInfo: Thunk<ISettingsModel, boolean>;
  changeGoogleDriveBackupEnabled: Thunk<ISettingsModel, boolean>;
  changePreferFiat: Thunk<ISettingsModel, boolean>;
  changeTransactionGeolocationEnabled: Thunk<ISettingsModel, boolean>;

  setBitcoinUnit: Action<ISettingsModel, keyof IBitcoinUnits>;
  setFiatUnit: Action<ISettingsModel, keyof IFiatRates>;
  setName: Action<ISettingsModel, string | null>;
  setAutopilotEnabled: Action<ISettingsModel, boolean>;
  setPushNotificationsEnabled: Action<ISettingsModel, boolean>;
  setClipboardInvoiceCheckInvoicesEnabled: Action<ISettingsModel, boolean>;
  setScheduledSyncEnabled: Action<ISettingsModel, boolean>;
  setDebugShowStartupInfo: Action<ISettingsModel, boolean>;
  setGoogleDriveBackupEnabled: Action<ISettingsModel, boolean>;
  setPreferFiat: Action<ISettingsModel, boolean>;
  setTransactionGeolocationEnabled: Action<ISettingsModel, boolean>;

  bitcoinUnit: keyof IBitcoinUnits;
  fiatUnit: keyof IFiatRates;
  name: string | null;
  autopilotEnabled: boolean;
  pushNotificationsEnabled: boolean;
  clipboardInvoiceCheckEnabled: boolean;
  scheduledSyncEnabled: boolean;
  debugShowStartupInfo: boolean;
  googleDriveBackupEnabled: boolean;
  preferFiat: boolean;
  transactionGeolocationEnabled: boolean;
}

export const settings: ISettingsModel = {
  initialize: thunk(async (actions) => {
    actions.setBitcoinUnit(await getItemObject(StorageItem.bitcoinUnit) || "bitcoin");
    actions.setFiatUnit(await getItemObject(StorageItem.fiatUnit) || "USD");
    actions.setName(await getItemObject(StorageItem.name) || null);
    actions.setAutopilotEnabled(await getItemObject(StorageItem.autopilotEnabled || false));
    actions.setPushNotificationsEnabled(await getItemObject(StorageItem.pushNotificationsEnabled || false));
    actions.setClipboardInvoiceCheckInvoicesEnabled(await getItemObject(StorageItem.clipboardInvoiceCheck || false));
    actions.setScheduledSyncEnabled(await getItemObject(StorageItem.scheduledSyncEnabled) || false);
    actions.setDebugShowStartupInfo(await getItemObject(StorageItem.debugShowStartupInfo) || false);
    actions.setGoogleDriveBackupEnabled(await getItemObject(StorageItem.googleDriveBackupEnabled) || false);
    actions.setPreferFiat(await getItemObject(StorageItem.preferFiat) || false);
    actions.setTransactionGeolocationEnabled(await getItemObject(StorageItem.transactionGeolocationEnabled) || false);
  }),

  changeBitcoinUnit: thunk(async (actions, payload) => {
    await setItemObject(StorageItem.bitcoinUnit, payload);
    actions.setBitcoinUnit(payload);
  }),

  changeFiatUnit: thunk(async (actions, payload) => {
    await setItemObject(StorageItem.fiatUnit, payload);
    actions.setFiatUnit(payload);
  }),

  changeName: thunk(async (actions, payload) => {
    if (payload && payload.length === 0) {
      payload = null;
    }
    await setItemObject(StorageItem.name, payload);
    actions.setName(payload);
  }),

  changeAutopilotEnabled: thunk(async (actions, payload) => {
    await setItemObject(StorageItem.autopilotEnabled, payload);
    actions.setAutopilotEnabled(payload);
  }),

  changePushNotificationsEnabled: thunk(async (actions, payload) => {
    await setItemObject(StorageItem.pushNotificationsEnabled, payload);
    actions.setPushNotificationsEnabled(payload);
  }),

  changeClipboardInvoiceCheckEnabled: thunk(async (actions, payload) => {
    await setItemObject(StorageItem.clipboardInvoiceCheck, payload);
    actions.setClipboardInvoiceCheckInvoicesEnabled(payload);
  }),

  changeScheduledSyncEnabled: thunk(async (actions, payload) => {
    await setItemObject(StorageItem.scheduledSyncEnabled, payload);
    actions.setScheduledSyncEnabled(payload);
  }),

  changeDebugShowStartupInfo: thunk(async (actions, payload) => {
    await setItemObject(StorageItem.debugShowStartupInfo, payload);
    actions.setDebugShowStartupInfo(payload);
  }),

  changeGoogleDriveBackupEnabled: thunk(async (actions, payload) => {
    await setItemObject(StorageItem.googleDriveBackupEnabled, payload);
    actions.setGoogleDriveBackupEnabled(payload);
  }),

  changePreferFiat: thunk(async (actions, payload) => {
    await setItemObject(StorageItem.preferFiat, payload);
    actions.setPreferFiat(payload);
  }),

  changeTransactionGeolocationEnabled: thunk(async (actions, payload) => {
    await setItemObject(StorageItem.transactionGeolocationEnabled, payload);
    actions.setTransactionGeolocationEnabled(payload);
  }),

  setBitcoinUnit: action((state, payload) => { state.bitcoinUnit = payload; }),
  setFiatUnit: action((state, payload) => { state.fiatUnit = payload; }),
  setName: action((state, payload) => { state.name = payload; }),
  setAutopilotEnabled: action((state, payload) => { state.autopilotEnabled = payload; }),
  setPushNotificationsEnabled: action((state, payload) => { state.pushNotificationsEnabled = payload; }),
  setClipboardInvoiceCheckInvoicesEnabled: action((state, payload) => { state.clipboardInvoiceCheckEnabled = payload; }),
  setScheduledSyncEnabled: action((state, payload) => { state.scheduledSyncEnabled = payload; }),
  setDebugShowStartupInfo: action((state, payload) => { state.debugShowStartupInfo = payload; }),
  setGoogleDriveBackupEnabled: action((state, payload) => { state.googleDriveBackupEnabled = payload; }),
  setPreferFiat: action((state, payload) => { state.preferFiat = payload; }),
  setTransactionGeolocationEnabled: action((state, payload) => { state.transactionGeolocationEnabled = payload; }),

  bitcoinUnit: "bitcoin",
  fiatUnit: "USD",
  name: null,
  autopilotEnabled: false,
  pushNotificationsEnabled: false,
  clipboardInvoiceCheckEnabled: false,
  scheduledSyncEnabled: false,
  debugShowStartupInfo: false,
  googleDriveBackupEnabled: false,
  preferFiat: false,
  transactionGeolocationEnabled: false,
};

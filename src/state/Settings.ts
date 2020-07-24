import { Action, action, Thunk, thunk } from "easy-peasy";

import { StorageItem, getItemObject, setItemObject, removeItem, getItem, setItem } from "../storage/app";
import { IFiatRates } from "./Fiat";
import { IBitcoinUnit, IBitcoinUnits, BitcoinUnits } from "../utils/bitcoin-units";
import { MapStyle } from "../utils/google-maps";
import { Chain } from "../utils/build";

import logger from "./../utils/log";
const log = logger("Settings");

export const OnchainExplorer = {
  mempool: "https://mempool.space/tx/",
  blockstream: `https://blockstream.info/${Chain === "testnet" ? "testnet/" : ""}tx/`,
  oxt: `https://oxt.me/transaction/`,
  blockchair: "https://blockchair.com/bitcoin/transaction/",
};

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
  changeTransactionGeolocationMapStyle: Thunk<ISettingsModel, keyof typeof MapStyle>;
  changeExperimentWeblnEnabled: Thunk<ISettingsModel, boolean>;
  changeOnchainExplorer: Thunk<ISettingsModel, keyof typeof OnchainExplorer>;
  changeMultiPathPaymentsEnabled: Thunk<ISettingsModel, boolean>;
  changeTorEnabled: Thunk<ISettingsModel, boolean>;

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
  setTransactionGeolocationMapStyle: Action<ISettingsModel, keyof typeof MapStyle>;
  setExperimentWeblnEnabled: Action<ISettingsModel, boolean>;
  setOnchainExplorer: Action<ISettingsModel, keyof typeof OnchainExplorer>;
  setMultiPathPaymentsEnabled: Action<ISettingsModel, boolean>;
  setTorEnabled: Action<ISettingsModel, boolean>;

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
  transactionGeolocationMapStyle: keyof typeof MapStyle;
  experimentWeblnEnabled: boolean;
  onchainExplorer: keyof typeof OnchainExplorer;
  multiPathPaymentsEnabled: boolean;
  torEnabled: boolean;
}

export const settings: ISettingsModel = {
  initialize: thunk(async (actions) => {
    log.d("Initializing");
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
    actions.setTransactionGeolocationMapStyle(await getItem(StorageItem.transactionGeolocationMapStyle) as keyof typeof MapStyle || "darkMode");
    actions.setExperimentWeblnEnabled(await getItemObject(StorageItem.experimentWeblnEnabled || false));
    actions.setOnchainExplorer(await getItem(StorageItem.onchainExplorer) ?? "mempool");
    actions.setMultiPathPaymentsEnabled(await getItemObject(StorageItem.multiPathPaymentsEnabled || false));
    actions.setTorEnabled(await getItemObject(StorageItem.torEnabled) || false);

    log.d("Done");
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

  changeTransactionGeolocationMapStyle: thunk(async (actions, payload) => {
    await setItem(StorageItem.transactionGeolocationMapStyle, payload);
    actions.setTransactionGeolocationMapStyle(payload);
  }),

  changeExperimentWeblnEnabled: thunk(async (actions, payload) => {
    await setItemObject(StorageItem.experimentWeblnEnabled, payload);
    actions.setExperimentWeblnEnabled(payload);
  }),

  changeOnchainExplorer: thunk(async (actions, payload) => {
    await setItem(StorageItem.onchainExplorer, payload);
    actions.setOnchainExplorer(payload);
  }),

  changeMultiPathPaymentsEnabled: thunk(async (actions, payload) => {
    await setItemObject(StorageItem.multiPathPaymentsEnabled, payload);
    actions.setMultiPathPaymentsEnabled(payload);
  }),

  changeTorEnabled: thunk(async (actions, payload) => {
    await setItemObject(StorageItem.torEnabled, payload);
    actions.setTorEnabled(payload);
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
  setTransactionGeolocationMapStyle: action((state, payload) => { state.transactionGeolocationMapStyle = payload; }),
  setExperimentWeblnEnabled: action((state, payload) => { state.experimentWeblnEnabled = payload; }),
  setOnchainExplorer: action((state, payload) => { state.onchainExplorer = payload; }),
  setMultiPathPaymentsEnabled: action((state, payload) => { state.multiPathPaymentsEnabled = payload; }),
  setTorEnabled: action((state, payload) => { state.torEnabled = payload; }),

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
  transactionGeolocationMapStyle: "darkMode",
  experimentWeblnEnabled: false,
  onchainExplorer: "mempool",
  multiPathPaymentsEnabled: false,
  torEnabled: false,
};

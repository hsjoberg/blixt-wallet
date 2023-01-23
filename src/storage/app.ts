import AsyncStorage from "@react-native-community/async-storage";
import { LoginMethods } from "../state/Security";
import { IBitcoinUnits } from "../utils/bitcoin-units";
import { IFiatRates } from "../state/Fiat";
import { MapStyle } from "../utils/google-maps";
import { appMigration } from "../migration/app-migration";
import { Chain, VersionCode } from "../utils/build";
import { LndChainBackend } from "../state/Lightning";
import { DEFAULT_DUNDER_SERVER, DEFAULT_INVOICE_EXPIRY, DEFAULT_NEUTRINO_NODE, PLATFORM } from "../utils/constants";

const APP_VERSION = appMigration.length - 1;

export enum StorageItem { // const enums not supported in Babel 7...
  app = "app",
  appVersion = "appVersion",
  appBuild = "appBuild",
  databaseCreated = "databaseCreated",
  walletCreated = "walletCreated",
  firstSync = "firstSync",
  timeSinceLastSync = "timeSinceLastSync",
  lightningBalance = "lightningBalance",
  loginMethods = "loginMethods",
  seedStored = "seedStored",
  bitcoinUnit = "bitcoinUnit",
  fiatUnit = "fiatUnit",
  name = "name",
  language = "language",
  walletPassword = "walletPassword",
  autopilotEnabled = "autopilotEnabled",
  pushNotificationsEnabled = "pushNotificationsEnabled",
  clipboardInvoiceCheck = "clipboardInvoiceCheck",
  scheduledSyncEnabled = "scheduledSyncEnabled",
  lastScheduledSync = "lastScheduledSync",
  lastScheduledSyncAttempt = "lastScheduledSyncAttempt",
  debugShowStartupInfo = "debugShowStartupInfo",
  googleDriveBackupEnabled = "googleDriveBackupEnabled",
  preferFiat = "preferFiat",
  transactionGeolocationEnabled = "transactionGeolocationEnabled",
  transactionGeolocationMapStyle = "transactionGeolocationMapStyle",
  onchainExplorer = "onchainExplorer",
  multiPathPaymentsEnabled = "multiPathPaymentsEnabled",
  onboardingState = "onboardingState",
  torEnabled = "torEnabled",
  hideExpiredInvoices = "hideExpiredInvoices",
  lastGoogleDriveBackup = "lastGoogleDriveBackup",
  screenTransitionsEnabled = "screenTransitionsEnabled",
  iCloudBackupEnabled = "iCloudBackupEnabled",
  lastICloudBackup = "lastICloudBackup",
  lndChainBackend = "lndChainBackend",
  neutrinoPeers = "neutrinoPeers",
  neutrinoFeeUrl = "neutrinoFeeUrl",
  bitcoindRpcHost = "bitcoindRpcHost",
  bitcoindRpcUser = "bitcoindRpcUser",
  bitcoindRpcPass = "bitcoindRpcPass",
  bitcoindPubRawBlock = "bitcoindPubRawBlock",
  bitcoindPubRawTx = "bitcoindPubRawTx",
  dunderServer = "dunderServer",
  requireGraphSync = "requireGraphSync",
  dunderEnabled = "dunderEnabled",
  lndNoGraphCache = "lndNoGraphCache",
  invoiceExpiry = "invoiceExpiry", // in seconds
  rescanWallet = "rescanWallet",
  receiveViaP2TR = "receiveViaP2TR",
  strictGraphPruningEnabled = "strictGraphPruningEnabled",
  persistentServicesEnabled = "persistentServicesEnabled",
  persistentServicesWarningShown = "persistentServicesWarningShown",
}

export const setItem = async (key: StorageItem, value: string) => await AsyncStorage.setItem(key, value);
export const setItemObject = async <T>(key: StorageItem, value: T) => await AsyncStorage.setItem(key, JSON.stringify(value));
export const getItem = async (key: StorageItem) => await AsyncStorage.getItem(key);
export const getItemObject = async <T = any>(key: StorageItem): Promise<T> => JSON.parse(await AsyncStorage.getItem(key) || "null");
export const removeItem = async (key: StorageItem) => await AsyncStorage.removeItem(key);
export const getAppVersion = async (): Promise<number> => {
  return await getItemObject(StorageItem.appVersion) || 0;
};
export const getAppBuild = async (): Promise<number> => {
  return await getItemObject(StorageItem.appBuild) || 0;
};
export const setAppVersion = async (version: number): Promise<void> => {
  return await setItemObject(StorageItem.appVersion, version);
};
export const setAppBuild = async (version: number): Promise<void> => {
  return await setItemObject(StorageItem.appBuild, version);
};
export const getWalletCreated = async (): Promise<boolean> => {
  return await getItemObject(StorageItem.walletCreated) || false;
};
export const getRescanWallet = async (): Promise<boolean> => {
  return await getItemObject(StorageItem.rescanWallet) || false;
};
export const setRescanWallet = async (rescan: boolean): Promise<void> => {
  return await setItemObject<boolean>(StorageItem.rescanWallet, rescan);
};

export const clearApp = async () => {
  // TODO use AsyncStorage.clear?
  await Promise.all([
    removeItem(StorageItem.app),
    removeItem(StorageItem.appVersion),
    removeItem(StorageItem.appBuild),
    removeItem(StorageItem.walletCreated),
    removeItem(StorageItem.firstSync),
    removeItem(StorageItem.timeSinceLastSync),
    removeItem(StorageItem.lightningBalance),
    removeItem(StorageItem.loginMethods),
    removeItem(StorageItem.seedStored),
    removeItem(StorageItem.bitcoinUnit),
    removeItem(StorageItem.fiatUnit),
    removeItem(StorageItem.name),
    removeItem(StorageItem.language),
    removeItem(StorageItem.walletPassword),
    removeItem(StorageItem.autopilotEnabled),
    removeItem(StorageItem.pushNotificationsEnabled),
    removeItem(StorageItem.clipboardInvoiceCheck),
    removeItem(StorageItem.scheduledSyncEnabled),
    removeItem(StorageItem.lastScheduledSync),
    removeItem(StorageItem.lastScheduledSyncAttempt),
    removeItem(StorageItem.debugShowStartupInfo),
    removeItem(StorageItem.googleDriveBackupEnabled),
    removeItem(StorageItem.preferFiat),
    removeItem(StorageItem.transactionGeolocationEnabled),
    removeItem(StorageItem.transactionGeolocationMapStyle),
    removeItem(StorageItem.onchainExplorer),
    removeItem(StorageItem.multiPathPaymentsEnabled),
    removeItem(StorageItem.onboardingState),
    removeItem(StorageItem.torEnabled),
    removeItem(StorageItem.hideExpiredInvoices),
    removeItem(StorageItem.lastGoogleDriveBackup),
    removeItem(StorageItem.screenTransitionsEnabled),
    removeItem(StorageItem.iCloudBackupEnabled),
    removeItem(StorageItem.lastICloudBackup),
    removeItem(StorageItem.lndChainBackend),
    removeItem(StorageItem.neutrinoPeers),
    removeItem(StorageItem.neutrinoFeeUrl),
    removeItem(StorageItem.bitcoindRpcHost),
    removeItem(StorageItem.bitcoindRpcUser),
    removeItem(StorageItem.bitcoindRpcPass),
    removeItem(StorageItem.bitcoindPubRawBlock),
    removeItem(StorageItem.bitcoindPubRawTx),
    removeItem(StorageItem.dunderServer),
    removeItem(StorageItem.requireGraphSync),
    removeItem(StorageItem.dunderEnabled),
    removeItem(StorageItem.lndNoGraphCache),
    removeItem(StorageItem.invoiceExpiry),
    removeItem(StorageItem.rescanWallet),
    removeItem(StorageItem.receiveViaP2TR),
    removeItem(StorageItem.strictGraphPruningEnabled),
    removeItem(StorageItem.persistentServicesEnabled),
    removeItem(StorageItem.persistentServicesWarningShown),
  ]);
};

export const setupApp = async () => {
  let lndChainBackend: LndChainBackend = "neutrino";
  let neutrinoPeers: string[] = [];
  let neutrinoFeeUrl = "";
  if (Chain === "mainnet" || Chain === "testnet") {
    lndChainBackend = "neutrino";
    neutrinoPeers.push(DEFAULT_NEUTRINO_NODE);
    neutrinoFeeUrl = "https://nodes.lightning.computer/fees/v1/btc-fee-estimates.json";
  }

  let bitcoindRpcHost = "";
  let bitcoindRpcUser = "";
  let bitcoindRpcPass = "";
  let bitcoindPubRawBlock = "";
  let bitcoindPubRawTx = "";
  if (Chain === "regtest") {
    // neutrinoPeers.push("127.0.0.1:19444");
    // lndChainBackend = "bitcoindWithZmq";
    // bitcoindRpcHost = "192.168.1.113:18443";
    // bitcoindRpcUser = "polaruser";
    // bitcoindRpcPass = "polarpass";
    // bitcoindPubRawBlock = "192.168.1.113:28334";
    // bitcoindPubRawTx = "192.168.1.113:29335";
  }

  await Promise.all([
    setItemObject<boolean>(StorageItem.app, true),
    setItemObject<number>(StorageItem.appVersion, APP_VERSION),
    setItemObject<number>(StorageItem.appBuild, VersionCode),
    setItemObject<boolean>(StorageItem.walletCreated, false),
    setItemObject<boolean>(StorageItem.firstSync, true),
    setItemObject<number>(StorageItem.timeSinceLastSync, 0),
    setItemObject<string>(StorageItem.lightningBalance, "0"),
    setItemObject<LoginMethods[]>(StorageItem.loginMethods, []),
    setItemObject<boolean>(StorageItem.seedStored, false), // !
    setItemObject<keyof IBitcoinUnits>(StorageItem.bitcoinUnit, "sat"),
    setItemObject<keyof IFiatRates>(StorageItem.fiatUnit, "USD"),
    setItemObject<string>(StorageItem.language, "en"),
    // walletPassword
    setItemObject<boolean>(StorageItem.autopilotEnabled, true),
    setItemObject<boolean>(StorageItem.pushNotificationsEnabled, true),
    setItemObject<boolean>(StorageItem.clipboardInvoiceCheck, PLATFORM === "ios" ? false : true),
    setItemObject<boolean>(StorageItem.scheduledSyncEnabled, false),
    setItemObject<number>(StorageItem.lastScheduledSync, 0),
    setItemObject<number>(StorageItem.lastScheduledSyncAttempt, 0),
    setItemObject<boolean>(StorageItem.debugShowStartupInfo, false),
    setItemObject<boolean>(StorageItem.googleDriveBackupEnabled, false),
    setItemObject<boolean>(StorageItem.preferFiat, false),
    setItemObject<boolean>(StorageItem.transactionGeolocationEnabled, false),
    setItem<keyof typeof MapStyle>(StorageItem.transactionGeolocationMapStyle, "darkMode"),
    setItem(StorageItem.onchainExplorer, "mempool"),
    setItemObject<boolean>(StorageItem.multiPathPaymentsEnabled, true),
    setItem(StorageItem.onboardingState, "SEND_ONCHAIN"),
    setItemObject<boolean>(StorageItem.torEnabled, false),
    setItemObject<boolean>(StorageItem.hideExpiredInvoices, true),
    setItemObject<number>(StorageItem.lastGoogleDriveBackup, new Date().getTime()),
    setItemObject<boolean>(StorageItem.screenTransitionsEnabled, true),
    setItemObject<boolean>(StorageItem.iCloudBackupEnabled, false),
    setItemObject<number>(StorageItem.lastICloudBackup, new Date().getTime()),
    setItem(StorageItem.lndChainBackend, lndChainBackend),
    setItemObject<string[]>(StorageItem.neutrinoPeers, neutrinoPeers),
    setItem(StorageItem.neutrinoFeeUrl, neutrinoFeeUrl),
    setItem(StorageItem.bitcoindRpcHost, bitcoindRpcHost),
    setItem(StorageItem.bitcoindRpcUser, bitcoindRpcUser),
    setItem(StorageItem.bitcoindRpcPass, bitcoindRpcPass),
    setItem(StorageItem.bitcoindPubRawBlock, bitcoindPubRawBlock),
    setItem(StorageItem.bitcoindPubRawTx, bitcoindPubRawTx),
    setItem(StorageItem.dunderServer, DEFAULT_DUNDER_SERVER),
    setItemObject<boolean>(StorageItem.requireGraphSync, false),
    setItemObject<boolean>(StorageItem.dunderEnabled, false),
    setItemObject<boolean>(StorageItem.lndNoGraphCache, false),
    setItemObject<number>(StorageItem.invoiceExpiry, DEFAULT_INVOICE_EXPIRY),
    setItemObject<boolean>(StorageItem.rescanWallet, false),
    setItemObject<boolean>(StorageItem.receiveViaP2TR, false),
    setItemObject<boolean>(StorageItem.strictGraphPruningEnabled, false),
    setItemObject<boolean>(StorageItem.persistentServicesEnabled, false),
    setItemObject<boolean>(StorageItem.persistentServicesWarningShown, false),
  ]);
};

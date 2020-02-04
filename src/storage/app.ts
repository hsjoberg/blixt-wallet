import AsyncStorage from "@react-native-community/async-storage";
import { LoginMethods } from "../state/Security";
import { IBitcoinUnits } from "../utils/bitcoin-units";
import { IFiatRates } from "../state/Fiat";

const APP_VERSION = 5;

export enum StorageItem { // const enums not supported in Babel 7...
  app = "app",
  appVersion = "appVersion",
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
  walletPassword = "walletPassword",
  autopilotEnabled = "autopilotEnabled",
  pushNotificationsEnabled = "pushNotificationsEnabled",
  clipboardInvoiceCheck = "clipboardInvoiceCheck",
  scheduledSyncEnabled = "scheduledSyncEnabled",
  lastScheduledSync = "lastScheduledSync",
  lastScheduledSyncAttempt = "lastScheduledSyncAttempt",
  debugShowStartupInfo = "debugShowStartupInfo",
  googleDriveBackupEnabled = "googleDriveBackupEnabled",
}

export const setItem = async (key: StorageItem, value: string) => await AsyncStorage.setItem(key, value);
export const setItemObject = async <T>(key: StorageItem, value: T) => await AsyncStorage.setItem(key, JSON.stringify(value));
export const getItem = async (key: StorageItem) => await AsyncStorage.getItem(key);
export const getItemObject = async <T = any>(key: StorageItem): Promise<T> => JSON.parse(await AsyncStorage.getItem(key) || "null");
export const removeItem = async (key: StorageItem) => await AsyncStorage.removeItem(key);
export const getAppVersion = async (): Promise<number> => {
  return await getItemObject(StorageItem.appVersion) || 0;
};
export const setAppVersion = async (version: number): Promise<void> => {
  return await setItemObject(StorageItem.appVersion, version);
};

export const getWalletCreated = async (): Promise<boolean> => {
  return await getItemObject(StorageItem.walletCreated) || false;
};

export const clearApp = async () => {
  // TODO use AsyncStorage.clear?
  await Promise.all([
    removeItem(StorageItem.app),
    removeItem(StorageItem.appVersion),
    removeItem(StorageItem.walletCreated),
    removeItem(StorageItem.firstSync),
    removeItem(StorageItem.timeSinceLastSync),
    removeItem(StorageItem.lightningBalance),
    removeItem(StorageItem.loginMethods),
    removeItem(StorageItem.seedStored),
    removeItem(StorageItem.bitcoinUnit),
    removeItem(StorageItem.fiatUnit),
    removeItem(StorageItem.name),
    removeItem(StorageItem.walletPassword),
    removeItem(StorageItem.autopilotEnabled),
    removeItem(StorageItem.pushNotificationsEnabled),
    removeItem(StorageItem.clipboardInvoiceCheck),
    removeItem(StorageItem.scheduledSyncEnabled),
    removeItem(StorageItem.lastScheduledSync),
    removeItem(StorageItem.lastScheduledSyncAttempt),
    removeItem(StorageItem.debugShowStartupInfo),
    removeItem(StorageItem.googleDriveBackupEnabled),
  ]);
};

export const setupApp = async () => {
  await Promise.all([
    setItemObject<boolean>(StorageItem.app, true),
    setItemObject<number>(StorageItem.appVersion, APP_VERSION),
    setItemObject<boolean>(StorageItem.walletCreated, false),
    setItemObject<boolean>(StorageItem.firstSync, true),
    setItemObject<number>(StorageItem.timeSinceLastSync, 0),
    setItemObject<string>(StorageItem.lightningBalance, "0"),
    setItemObject<LoginMethods[]>(StorageItem.loginMethods, []),
    setItemObject<boolean>(StorageItem.seedStored, false), // !
    setItemObject<keyof IBitcoinUnits>(StorageItem.bitcoinUnit, "bitcoin"),
    setItemObject<keyof IFiatRates>(StorageItem.fiatUnit, "USD"),
    // walletPassword
    setItemObject<boolean>(StorageItem.autopilotEnabled, true),
    setItemObject<boolean>(StorageItem.pushNotificationsEnabled, true),
    setItemObject<boolean>(StorageItem.clipboardInvoiceCheck, true),
    setItemObject<boolean>(StorageItem.scheduledSyncEnabled, false),
    setItemObject<number>(StorageItem.lastScheduledSync, 0),
    setItemObject<number>(StorageItem.lastScheduledSyncAttempt, 0),
    setItemObject<boolean>(StorageItem.debugShowStartupInfo, false),
    setItemObject<boolean>(StorageItem.googleDriveBackupEnabled, false),
  ]);
};

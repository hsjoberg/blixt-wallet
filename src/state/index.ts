import { NativeModules } from "react-native";
import { Thunk, thunk, Action, action } from "easy-peasy";
import { SQLiteDatabase } from "react-native-sqlite-storage";
import { generateSecureRandom } from "react-native-securerandom";
import * as base64 from "base64-js";

import { IStoreInjections } from "./store";
import { ILightningModel, lightning } from "./Lightning";
import { ITransactionModel, transaction } from "./Transaction";
import { IChannelModel, channel } from "./Channel";
import { ISendModel, send } from "./Send";
import { IReceiveModel, receive } from "./Receive";
import { IOnChainModel, onChain } from "./OnChain";
import { IFiatModel, fiat } from "./Fiat";
import { ISecurityModel, security } from "./Security";
import { ISettingsModel, settings } from "./Settings";
import { IClipboardManagerModel, clipboardManager } from "./ClipboardManager";
import { IScheduledSyncModel, scheduledSync } from "./ScheduledSync";
import { ILNUrlModel, lnUrl } from "./LNURL";
import { IGoogleModel, google } from "./Google";
import { IGoogleDriveBackupModel, googleDriveBackup } from "./GoogleDriveBackup";
import { IWebLNModel, webln } from "./WebLN";
import { IAndroidDeeplinkManager, androidDeeplinkManager } from "./AndroidDeeplinkManager";
import { INotificationManagerModel, notificationManager} from "./NotificationManager";

import { ELndMobileStatusCodes } from "../lndmobile/index";
import { clearApp, setupApp, getWalletCreated, StorageItem, getItem as getItemAsyncStorage, getItemObject as getItemObjectAsyncStorage, setItemObject, setItem, getAppVersion, setAppVersion } from "../storage/app";
import { openDatabase, setupInitialSchema, deleteDatabase, dropTables } from "../storage/database/sqlite";
import { clearTransactions } from "../storage/database/transaction";
import { appMigration } from "../migration/app-migration";
import { timeout } from "../utils";
import { setWalletPassword, getItem } from "../storage/keystore";

import logger from "./../utils/log";
const log = logger("Store");

type OnboardingState = "SEND_ONCHAIN" | "DO_BACKUP" | "DONE";

export interface ICreateWalletPayload {
  restore?: {
    restoreWallet: boolean,
    channelsBackup?: string;
  }
}

export interface IStoreModel {
  initializeApp: Thunk<IStoreModel, void, IStoreInjections, IStoreModel>;
  checkAppVersionMigration: Thunk<IStoreModel, void, IStoreInjections, IStoreModel>;
  clearApp: Thunk<IStoreModel>;
  clearTransactions: Thunk<IStoreModel>;
  resetDb: Thunk<IStoreModel>;
  setDb: Action<IStoreModel, SQLiteDatabase>;
  setAppReady: Action<IStoreModel, boolean>;
  setWalletCreated: Action<IStoreModel, boolean>;
  setHoldOnboarding: Action<IStoreModel, boolean>;
  setWalletSeed: Action<IStoreModel, string[] | undefined>;
  setAppVersion: Action<IStoreModel, number>;
  setOnboardingState: Action<IStoreModel, OnboardingState>;
  setTorEnabled: Action<IStoreModel, boolean>;
  setTorLoading: Action<IStoreModel, boolean>;

  generateSeed: Thunk<IStoreModel, void, IStoreInjections>;
  createWallet: Thunk<IStoreModel, ICreateWalletPayload | void, IStoreInjections, IStoreModel>;
  changeOnboardingState: Thunk<IStoreModel, OnboardingState>;

  db?: SQLiteDatabase;
  appReady: boolean;
  walletCreated: boolean;
  holdOnboarding: boolean;
  torLoading: boolean;
  torEnabled: boolean;

  lightning: ILightningModel;
  transaction: ITransactionModel;
  channel: IChannelModel;
  send: ISendModel;
  receive: IReceiveModel;
  onChain: IOnChainModel;
  fiat: IFiatModel;
  security: ISecurityModel;
  settings: ISettingsModel;
  clipboardManager: IClipboardManagerModel;
  scheduledSync: IScheduledSyncModel;
  lnUrl: ILNUrlModel;
  google: IGoogleModel;
  googleDriveBackup: IGoogleDriveBackupModel;
  webln: IWebLNModel;
  androidDeeplinkManager: IAndroidDeeplinkManager;
  notificationManager: INotificationManagerModel;

  walletSeed?: string[];
  appVersion: number;
  onboardingState: OnboardingState;
}

export const model: IStoreModel = {
  initializeApp: thunk(async (actions, _, { getState, dispatch, injections }) => {
    log.d("getState().appReady" + getState().appReady);
    if (getState().appReady) {
      log.d("App already initialized");
      return;
    }

    log.v("initializeApp()");

    const { init, writeConfigFile, checkStatus, startLnd } = injections.lndMobile.index;
    const db = await openDatabase();
    actions.setDb(db);
    if (!await getItemObjectAsyncStorage(StorageItem.app)) {
      log.i("Initializing app for the first time");
      await setupApp();
      log.i("Initializing db for the first time");
      await setupInitialSchema(db);
      log.i("Writing lnd.conf");
      await writeConfigFile();
    }
    actions.setAppVersion(await getAppVersion());
    await actions.checkAppVersionMigration();

    actions.setOnboardingState((await getItemAsyncStorage(StorageItem.onboardingState) as OnboardingState) ?? "DO_BACKUP");

    actions.setWalletCreated(await getWalletCreated());

    try {
      const torEnabled = await getItemObjectAsyncStorage<boolean>(StorageItem.torEnabled) ?? false;
      actions.setTorEnabled(torEnabled);
      if (torEnabled) {
        actions.setTorLoading(true);
        await NativeModules.BlixtTor.startTor(); // FIXME
      }

      log.v("Running LndMobile init()");
      const initReturn = await init();
      log.v("init done");
      log.d("init", [initReturn]);

      const status = await checkStatus();
      if (!getState().walletCreated && (status & ELndMobileStatusCodes.STATUS_PROCESS_STARTED) !== ELndMobileStatusCodes.STATUS_PROCESS_STARTED) {
        log.i("Wallet not created, starting lnd");
        log.d("lnd started", [await startLnd(torEnabled)]);
      }
    }
    catch (e) {
      log.e("Exception when trying to initialize LndMobile and start lnd", [e]);
      throw e;
    }

    log.d("Starting up stores");
    dispatch.fiat.getRate();
    await dispatch.settings.initialize();
    await dispatch.security.initialize();
    await dispatch.google.initialize();
    await dispatch.googleDriveBackup.initialize();
    await dispatch.transaction.getTransactions();
    await dispatch.channel.setupCachedBalance();
    log.d("Done starting up stores");
    actions.setAppReady(true);

    log.d("App initialized");
    return true;
  }),

  checkAppVersionMigration: thunk(async (_, _2, { getState }) => {
    const db = getState().db;
    if (!db) {
      throw new Error("Version migration check failed, db not available");
    }

    const appVersion = await getAppVersion();
    if (appVersion < (appMigration.length - 1)) {
      log.i(`Beginning App Version migration from ${appVersion} to ${appMigration.length - 1}`);
      for (let i = appVersion + 1; i < appMigration.length; i++) {
        log.i(`Migrating to ${i}`);
        await appMigration[i].beforeLnd(db, i);
      }
      await setAppVersion(appMigration.length - 1);
    }
  }),

  clearApp: thunk(async () => {
    await clearApp();
    await deleteDatabase();
  }),

  clearTransactions: thunk(async (_, _2, { getState }) => {
    await clearTransactions(getState().db!);
  }),

  resetDb: thunk(async (_, _2, { getState }) => {
    const { db } = getState();
    if (db) {
      try {
        await dropTables(db);
      } catch (e) {}
      await setupInitialSchema(db);
    }
  }),

  generateSeed: thunk(async (actions, _, { injections }) => {
    const { genSeed } = injections.lndMobile.wallet;
    const seed = await genSeed();
    actions.setWalletSeed(seed.cipherSeedMnemonic);
  }),

  setWalletSeed: action((state, payload) => {
    state.walletSeed = payload;
  }),

  createWallet: thunk(async (actions, payload, { injections, getState, dispatch }) => {
    const initWallet = injections.lndMobile.wallet.initWallet;
    const seed = getState().walletSeed;
    if (!seed) {
      return;
    }
    const random = await generateSecureRandom(32);
    const randomBase64 = base64.fromByteArray(random);
    await setItem(StorageItem.walletPassword, randomBase64);
    await setWalletPassword(randomBase64);

    const wallet = payload && payload.restore && payload.restore
      ? await initWallet(seed, randomBase64, 100, payload.restore.channelsBackup)
      : await initWallet(seed, randomBase64)

    await setItemObject(StorageItem.walletCreated, true);
    actions.setWalletCreated(true);
    await dispatch.security.storeSeed(seed);
    actions.setWalletSeed(undefined);
    return wallet;
  }),

  changeOnboardingState: thunk(async (actions, payload) => {
    await setItem(StorageItem.onboardingState, payload);
    actions.setOnboardingState(payload);
  }),

  setWalletCreated: action((state, payload) => { state.walletCreated = payload; }),
  setHoldOnboarding: action((state, payload) => { state.holdOnboarding = payload; }),
  setDb: action((state, db) => { state.db = db; }),
  setAppReady: action((state, value) => { state.appReady = value; }),
  setAppVersion: action((state, value) => { state.appVersion = value; }),
  setOnboardingState: action((state, value) => { state.onboardingState = value; }),
  setTorEnabled: action((state, value) => { state.torEnabled = value; }),
  setTorLoading: action((state, value) => { state.torLoading = value; }),

  appReady: false,
  walletCreated: false,
  holdOnboarding: false,
  appVersion: 0,
  onboardingState: "SEND_ONCHAIN",
  torEnabled: false,
  torLoading: false,

  lightning,
  transaction,
  channel,
  send,
  receive,
  onChain,
  fiat,
  security,
  settings,
  clipboardManager,
  scheduledSync,
  lnUrl,
  google,
  googleDriveBackup,
  webln,
  androidDeeplinkManager,
  notificationManager,
};

export default model;

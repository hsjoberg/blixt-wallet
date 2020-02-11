import { NativeModules, Linking } from "react-native";
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

import { ELndMobileStatusCodes } from "../lndmobile/index";
import { clearApp, setupApp, getWalletCreated, StorageItem, getItemObject, setItemObject, setItem, getAppVersion, setAppVersion } from "../storage/app";
import { openDatabase, setupInitialSchema, deleteDatabase, dropTables } from "../storage/database/sqlite";
import { clearTransactions } from "../storage/database/transaction";
import { appMigration } from "../migration/app-migration";
import { timeout } from "../utils";
import { setWalletPassword } from "../storage/keystore";

import logger from "./../utils/log";
const log = logger("Store");

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
  deeplinkChecker: Thunk<IStoreModel, void, IStoreInjections, IStoreModel, Promise<boolean | null>>;

  generateSeed: Thunk<IStoreModel, void, IStoreInjections>;
  createWallet: Thunk<IStoreModel, ICreateWalletPayload | void, IStoreInjections, IStoreModel>;

  db?: SQLiteDatabase;
  appReady: boolean;
  walletCreated: boolean;
  holdOnboarding: boolean;

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

  walletSeed?: string[];
  appVersion: number;
}

export const model: IStoreModel = {
  initializeApp: thunk(async (actions, _, { getState, dispatch, injections }) => {
    if (getState().appReady) {
      log.d("App already initialized");
      return;
    }

    const { init, writeConfigFile, checkStatus, startLnd } = injections.lndMobile.index;
    const db = await openDatabase();
    actions.setDb(db);
    if (!await getItemObject(StorageItem.app)) {
      log.i("Initializing app for the first time");
      await setupApp();
      log.i("Initializing db for the first time");
      await setupInitialSchema(db);
      log.i("Writing lnd.conf");
      await writeConfigFile();
    }
    actions.setAppVersion(await getAppVersion());
    await actions.checkAppVersionMigration();

    actions.setWalletCreated(await getWalletCreated());

    try {
      log.d("init", [await init()]);
      const status = await checkStatus();
      if ((status & ELndMobileStatusCodes.STATUS_PROCESS_STARTED) !== ELndMobileStatusCodes.STATUS_PROCESS_STARTED) {
        log.i("lnd not started, starting lnd");
        log.d("", [await startLnd()]);
      }
    }
    catch (e) {
      log.e("Exception when trying to init LndMobile and start lnd", [e]);
      throw e;
    }

    await dispatch.settings.initialize();
    dispatch.fiat.getRate();
    await dispatch.security.initialize();
    await dispatch.google.initialize();
    await dispatch.googleDriveBackup.initialize();
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
    const { initWallet } = injections.lndMobile.wallet;
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
    setTimeout(() => actions.setWalletSeed(undefined), 5000);
    return wallet;
  }),

  deeplinkChecker: thunk(async (actions, _, { getState, dispatch }) => {
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
        log.d("try lightningURI");

        while (!getState().lightning.rpcReady) {
          await timeout(500);
        }

        await dispatch.send.setPayment({ paymentRequestStr: lightningURI.toUpperCase().replace("LIGHTNING:", "") });
        return true;
      }
    } catch (e) {
      dispatch.send.clear();
      log.e("Error checking deeplink" + e.message);
    }
    return null;
  }),

  setWalletCreated: action((state, payload) => { state.walletCreated = payload; }),
  setHoldOnboarding: action((state, payload) => { state.holdOnboarding = payload; }),
  setDb: action((state, db) => { state.db = db; }),
  setAppReady: action((state, value) => { state.appReady = value; }),
  setAppVersion: action((state, value) => { state.appVersion = value; }),

  appReady: false,
  walletCreated: false,
  holdOnboarding: false,
  appVersion: 0,

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
};

export default model;

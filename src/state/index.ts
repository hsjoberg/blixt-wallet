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
  setWalletSeed: Action<IStoreModel, string[] | undefined>;
  setAppVersion: Action<IStoreModel, number>;

  generateSeed: Thunk<IStoreModel, void, IStoreInjections>;
  createWallet: Thunk<IStoreModel, ICreateWalletPayload | void, IStoreInjections, IStoreModel>;

  db?: SQLiteDatabase;
  appReady: boolean;
  walletCreated: boolean;

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
      console.log("App already initialized");
      return;
    }

    const { init, writeConfigFile, checkStatus, startLnd } = injections.lndMobile.index;
    const db = await openDatabase();
    actions.setDb(db);
    if (!await getItemObject(StorageItem.app)) {
      console.log("Initializing app for the first time");
      await setupApp();
      console.log("Initializing db for the first time");
      await setupInitialSchema(db);
      console.log("Writing lnd.conf");
      await writeConfigFile();
    }
    actions.setAppVersion(await getAppVersion());
    await actions.checkAppVersionMigration();

    actions.setWalletCreated(await getWalletCreated());

    try {
      console.log("init", await init());
      const status = await checkStatus();
      if ((status & ELndMobileStatusCodes.STATUS_PROCESS_STARTED) !== ELndMobileStatusCodes.STATUS_PROCESS_STARTED) {
        console.log("lnd not started, starting lnd");
        console.log(await startLnd());
      }
    }
    catch (e) {
      console.log("Exception", e);
      throw e;
    }

    await dispatch.settings.initialize();
    dispatch.fiat.getRate();
    await dispatch.security.initialize();
    await dispatch.google.initialize();
    await dispatch.googleDriveBackup.initialize();
    actions.setAppReady(true);

    console.log("App initialized");
    return true;
  }),

  checkAppVersionMigration: thunk(async (_, _2, { getState }) => {
    const db = getState().db;
    if (!db) {
      throw new Error("Version migration check failed, db not available");
    }

    const appVersion = await getAppVersion();
    if (appVersion < (appMigration.length - 1)) {
      console.log(`Beginning App Version migration from ${appVersion} to ${appMigration.length - 1}`);
      for (let i = appVersion + 1; i < appMigration.length; i++) {
        console.log(`Migrating to ${i}`);
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

    const wallet = payload && payload.restore && payload.restore
      ? await initWallet(seed, randomBase64, 100, payload.restore.channelsBackup)
      : await initWallet(seed, randomBase64)

    await setItemObject(StorageItem.walletCreated, true);
    actions.setWalletCreated(true);
    await dispatch.security.storeSeed(seed);
    setTimeout(() => actions.setWalletSeed(undefined), 5000);
    return wallet;
  }),

  setWalletCreated: action((state, payload) => { state.walletCreated = payload; }),
  setDb: action((state, db) => { state.db = db; }),
  setAppReady: action((state, value) => { state.appReady = value; }),
  setAppVersion: action((state, value) => { state.appVersion = value; }),

  appReady: false,
  walletCreated: false,
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

import { NativeModules } from "react-native";
import { Thunk, thunk, Action, action } from "easy-peasy";
import { SQLiteDatabase } from "react-native-sqlite-storage";
import { generateSecureRandom } from "react-native-securerandom";
import * as base64 from "base64-js";

import { IStoreInjections } from "./store";
import { ILightningModel, lightning, LndChainBackend } from "./Lightning";
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
import { IDeeplinkManager, deeplinkManager } from "./DeeplinkManager";
import { INotificationManagerModel, notificationManager } from "./NotificationManager";
import { ILightNameModel, lightName } from "./LightName";
import { IICloudBackupModel, iCloudBackup } from "./ICloudBackup";

import { ELndMobileStatusCodes } from "../lndmobile/index";
import { clearApp, setupApp, getWalletCreated, StorageItem, getItem as getItemAsyncStorage, getItemObject as getItemObjectAsyncStorage, setItemObject, setItem, getAppVersion, setAppVersion } from "../storage/app";
import { openDatabase, setupInitialSchema, deleteDatabase, dropTables } from "../storage/database/sqlite";
import { clearTransactions } from "../storage/database/transaction";
import { appMigration } from "../migration/app-migration";
import { setWalletPassword, getItem } from "../storage/keystore";
import { PLATFORM } from "../utils/constants";
import SetupBlixtDemo from "../utils/setup-demo";
import { Chain } from "../utils/build";

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
  setupDemo: Thunk<IStoreModel, { changeDb: boolean }, any, IStoreModel>;
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
  writeConfig: Thunk<IStoreModel, void, IStoreInjections, IStoreModel>;
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
  deeplinkManager: IDeeplinkManager;
  notificationManager: INotificationManagerModel;
  lightName: ILightNameModel;
  iCloudBackup: IICloudBackupModel;

  walletSeed?: string[];
  appVersion: number;
  onboardingState: OnboardingState;
}

export const model: IStoreModel = {
  setupDemo: thunk(async (_, payload, { getState, dispatch }) => {
    const db = getState().db;
    await SetupBlixtDemo(db, dispatch, payload.changeDb);
  }),

  initializeApp: thunk(async (actions, _, { getState, dispatch, injections }) => {
    log.d("getState().appReady: " + getState().appReady);
    if (getState().appReady) {
      log.d("App already initialized");
      return;
    }
    log.v("initializeApp()");

    const { initialize, checkStatus, startLnd } = injections.lndMobile.index;
    const db = await openDatabase();
    actions.setDb(db);
    if (!await getItemObjectAsyncStorage(StorageItem.app)) {
      log.i("Initializing app for the first time");
      if (PLATFORM === "ios") {
        log.i("Creating Application Support and lnd directories");
        await injections.lndMobile.index.createIOSApplicationSupportAndLndDirectories();
        log.i("Excluding lnd directory from backup")
        await injections.lndMobile.index.excludeLndICloudBackup();
      }

      await setupApp();
      log.i("Initializing db for the first time");
      await setupInitialSchema(db);
      log.i("Writing lnd.conf");
      await actions.writeConfig();

      if (PLATFORM === "web") {
        await dispatch.setupDemo({ changeDb: true });
        await dispatch.generateSeed();
        await dispatch.createWallet();
      }
    } else {
      // Temporarily dealing with moving lnd to "Application Support" folder
      if (PLATFORM === "ios") {
        if (!(await injections.lndMobile.index.checkLndFolderExists())) {
          log.i("Moving lnd from Documents to Application Support");
          await injections.lndMobile.index.createIOSApplicationSupportAndLndDirectories();
          await injections.lndMobile.index.TEMP_moveLndToApplicationSupport();
          log.i("Excluding lnd directory from backup")
          await injections.lndMobile.index.excludeLndICloudBackup()
        }
      }
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

      log.v("Running LndMobile.initialize()");
      const initReturn = await initialize();
      log.v("initialize done", [initReturn]);

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
    if (PLATFORM === "android") {
      await dispatch.google.initialize();
      await dispatch.googleDriveBackup.initialize();
    } else if (PLATFORM === "ios") {
      await dispatch.iCloudBackup.initialize();
    }
    await dispatch.transaction.getTransactions();
    await dispatch.channel.setupCachedBalance();
    log.d("Done starting up stores");
    actions.setAppReady(true);

    log.d("App initialized");
    return true;
  }),

  checkAppVersionMigration: thunk(async (actions, _2, { getState }) => {
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

      // Re-write configuration in case there's something new
      await actions.writeConfig();
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

  writeConfig: thunk(async (_, _2, { injections }) => {
    const writeConfig = injections.lndMobile.index.writeConfig;

    const lndChainBackend = await getItemAsyncStorage(StorageItem.lndChainBackend) as LndChainBackend;
    const node = Chain;
    const neutrinoPeers = await getItemObjectAsyncStorage<string[]>(StorageItem.neutrinoPeers);
    const neutrinoFeeUrl = await getItemAsyncStorage(StorageItem.neutrinoFeeUrl) || null;
    const bitcoindRpcHost = await getItemAsyncStorage(StorageItem.bitcoindRpcHost) || null;
    const bitcoindRpcUser = await getItemAsyncStorage(StorageItem.bitcoindRpcUser) || null;
    const bitcoindRpcPass = await getItemAsyncStorage(StorageItem.bitcoindRpcPass) || null;
    const bitcoindPubRawBlock = await getItemAsyncStorage(StorageItem.bitcoindPubRawBlock) || null;
    const bitcoindPubRawTx = await getItemAsyncStorage(StorageItem.bitcoindPubRawTx) || null;

    const config = `
[Application Options]
debuglevel=info
maxbackoff=2s
norest=1
sync-freelist=1
accept-keysend=1

[Routing]
routing.assumechanvalid=1

[Bitcoin]
bitcoin.active=1
bitcoin.${node}=1
bitcoin.node=${lndChainBackend === "neutrino" ? "neutrino" : "bitcoind"}

${lndChainBackend === "neutrino" ? `
[Neutrino]
${neutrinoPeers[0] !== undefined ? `neutrino.connect=${neutrinoPeers[0]}` : ""}
neutrino.feeurl=${neutrinoFeeUrl}
` : ""}

${lndChainBackend === "bitcoindWithZmq" ? `
[Bitcoind]
bitcoind.rpchost=${bitcoindRpcHost}
bitcoind.rpcuser=${bitcoindRpcUser}
bitcoind.rpcpass=${bitcoindRpcPass}
bitcoind.zmqpubrawblock=${bitcoindPubRawBlock}
bitcoind.zmqpubrawtx=${bitcoindPubRawTx}
` : ""}

[autopilot]
autopilot.active=0
autopilot.private=1
autopilot.minconfs=1
autopilot.conftarget=3
autopilot.allocation=1.0
autopilot.heuristic=externalscore:0.95
autopilot.heuristic=preferential:0.05
`;
    await writeConfig(config);
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
  deeplinkManager,
  notificationManager,
  lightName,
  iCloudBackup,
};

export default model;

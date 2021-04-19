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
import { IBlixtLsp, blixtLsp } from "./BlixtLsp";

import { ELndMobileStatusCodes } from "../lndmobile/index";
import { clearApp, setupApp, getWalletCreated, StorageItem, getItem as getItemAsyncStorage, getItemObject as getItemObjectAsyncStorage, setItemObject, setItem, getAppVersion, setAppVersion, getAppBuild, setAppBuild } from "../storage/app";
import { openDatabase, setupInitialSchema, deleteDatabase, dropTables } from "../storage/database/sqlite";
import { clearTransactions } from "../storage/database/transaction";
import { appMigration } from "../migration/app-migration";
import { setWalletPassword, getItem, getWalletPassword } from "../storage/keystore";
import { PLATFORM } from "../utils/constants";
import SetupBlixtDemo from "../utils/setup-demo";
import { Chain, VersionCode } from "../utils/build";
import { LndMobileEventEmitter } from "../utils/event-listener";
import { lnrpc } from "../../proto/proto";
import { toast } from "../utils";
import { Alert } from "../utils/alert";

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
  setAppBuild: Action<IStoreModel, number>;
  setOnboardingState: Action<IStoreModel, OnboardingState>;
  setTorEnabled: Action<IStoreModel, boolean>;
  setTorLoading: Action<IStoreModel, boolean>;

  generateSeed: Thunk<IStoreModel, void, IStoreInjections>;
  writeConfig: Thunk<IStoreModel, void, IStoreInjections, IStoreModel>;
  unlockWallet: Thunk<ILightningModel, void, IStoreInjections>;
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
  blixtLsp: IBlixtLsp;

  walletSeed?: string[];
  appVersion: number;
  appBuild: number;
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
      if (Chain === "regtest") {
        await setupRegtest(
          await getItemAsyncStorage(StorageItem.bitcoindRpcHost) ?? "",
          await getItemAsyncStorage(StorageItem.bitcoindPubRawBlock) ?? "",
          await getItemAsyncStorage(StorageItem.bitcoindPubRawTx) ?? "",
          dispatch.settings.changeBitcoindRpcHost,
          dispatch.settings.changeBitcoindPubRawBlock,
          dispatch.settings.changeBitcoindPubRawTx,
        );
      }
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
    actions.setAppBuild(await getAppBuild());
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
      log.d("status", [status]);
      if ((status & ELndMobileStatusCodes.STATUS_PROCESS_STARTED) !== ELndMobileStatusCodes.STATUS_PROCESS_STARTED) {
        log.i("Starting lnd");
        try {
          log.d("startLnd", [await startLnd(torEnabled)]);
        } catch (e) {
          if (e.message.includes("lnd already started")) {
            toast("lnd already started", 3000, "warning");
          } else {
            throw e;
          }
        }
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

    const start = new Date();
    LndMobileEventEmitter.addListener("SubscribeState", async (e: any) => {
      log.d("SubscribeState", [e]);
      if (e.data === "") {
        log.i("Got e.data empty from SubscribeState");
        return;
      }

      try {
        const state = injections.lndMobile.index.decodeState(e.data ?? "");
        log.i("Current lnd state", [state]);
        if (state.state === lnrpc.WalletState.NON_EXISTING) {
          log.d("Got lnrpc.WalletState.NON_EXISTING");
        } else if (state.state === lnrpc.WalletState.LOCKED) {
          log.d("Got lnrpc.WalletState.LOCKED");
          log.d("Wallet locked, unlocking wallet");
          await dispatch.unlockWallet();
        } else if (state.state === lnrpc.WalletState.UNLOCKED) {
          log.d("Got lnrpc.WalletState.UNLOCKED");
        } else if (state.state === lnrpc.WalletState.RPC_ACTIVE) {
          toast("RPC server active: " + (new Date().getTime() - start.getTime()) / 1000 + "s", 1000);
          log.d("Got lnrpc.WalletState.RPC_ACTIVE");
          await dispatch.lightning.initialize({ start });
        }
      } catch (e) {
        toast(e.message, undefined, "danger");
      }
    });
    await injections.lndMobile.index.subscribeState();

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
    }

    const appBuild = await getAppBuild();
    if (appBuild < VersionCode) {
      log.i("Found new app build");
      log.i("Writing config");
      await actions.writeConfig();
      await setAppBuild(VersionCode);
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

    const nodeBackend = lndChainBackend === "neutrino" ? "neutrino" : "bitcoind";

    const config = `
[Application Options]
debuglevel=info
maxbackoff=2s
norest=1
sync-freelist=1
accept-keysend=1
tlsdisableautofill=1
maxpendingchannels=1000

[Routing]
routing.assumechanvalid=1

[Bitcoin]
bitcoin.active=1
bitcoin.${node}=1
bitcoin.node=${nodeBackend}
bitcoin.defaultchanconfs=1

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
autopilot.heuristic=externalscore:${Chain === "testnet" || Chain === "mainnet" ? "1.00" : "0.95"}
autopilot.heuristic=preferential:${Chain === "testnet" || Chain === "mainnet" ? "0.00" : "0.05"}
`;
    await writeConfig(config);
  }),

  unlockWallet: thunk(async (_, _2, { injections }) => {
    const unlockWallet = injections.lndMobile.wallet.unlockWallet;
    // const password = await getItem(StorageItem.walletPassword);
    const password = await getWalletPassword();
    if (!password) {
      throw new Error("Cannot find wallet password");
    }
    await unlockWallet(password);
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
  setAppBuild: action((state, value) => { state.appBuild = value; }),
  setOnboardingState: action((state, value) => { state.onboardingState = value; }),
  setTorEnabled: action((state, value) => { state.torEnabled = value; }),
  setTorLoading: action((state, value) => { state.torLoading = value; }),

  appReady: false,
  walletCreated: false,
  holdOnboarding: false,
  appVersion: 0,
  appBuild: 0,
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
  blixtLsp,
};

export default model;

function setupRegtest(
  bitcoindRpcHost: string,
  bitcoindPubRawBlock: string,
  bitcoindPubRawTx: string,
  changeBitcoindRpcHost: any,
  changeBitcoindPubRawBlock: any,
  changeBitcoindPubRawTx: any
) {
  return new Promise((resolve, reject) => {
    Alert.prompt(
      "Set bitcoind RPC host",
      "",
      async (text) => {
        if (text) {
          await changeBitcoindRpcHost(text);
        }

        Alert.prompt(
          "Set bitcoind ZMQ Raw block host",
          "",
          async (text) => {
            if (text) {
              await changeBitcoindPubRawBlock(text);
            }

            Alert.prompt(
              "Set bitcoind ZMQ Raw Tx host",
              "",
              async (text) => {
                if (text) {
                  await changeBitcoindPubRawTx(text);
                }
                resolve(void(0));
              },
              "plain-text",
              bitcoindPubRawTx ?? "",
            );
          },
          "plain-text",
          bitcoindPubRawBlock ?? "",
        );
      },
      "plain-text",
      bitcoindRpcHost ?? "",
    );
  });
}

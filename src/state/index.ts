import { AlertButton, NativeModules } from "react-native";
import { Thunk, thunk, Action, action } from "easy-peasy";
import { SQLiteDatabase } from "react-native-sqlite-storage";
import { generateSecureRandom } from "react-native-securerandom";
import * as base64 from "base64-js";
import Tor from "react-native-tor";

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
import { IContactsModel, contacts } from "./Contacts";

import { ELndMobileStatusCodes } from "../lndmobile/index";
import { clearApp, setupApp, getWalletCreated, StorageItem, getItem as getItemAsyncStorage, getItemObject as getItemObjectAsyncStorage, setItemObject, setItem, getAppVersion, setAppVersion, getAppBuild, setAppBuild, getRescanWallet, setRescanWallet } from "../storage/app";
import { openDatabase, setupInitialSchema, deleteDatabase, dropTables } from "../storage/database/sqlite";
import { clearTransactions } from "../storage/database/transaction";
import { appMigration } from "../migration/app-migration";
import { setWalletPassword, getItem, getWalletPassword } from "../storage/keystore";
import { PLATFORM } from "../utils/constants";
import SetupBlixtDemo from "../utils/setup-demo";
import { Chain, VersionCode } from "../utils/build";
import { LndMobileEventEmitter } from "../utils/event-listener";
import { lnrpc } from "../../proto/lightning";
import { toast } from "../utils";
import { Alert } from "../utils/alert";
import { checkLndStreamErrorResponse } from "../utils/lndmobile";

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
  openDb: Thunk<IStoreModel, undefined, any, {}, Promise<SQLiteDatabase>>;
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
  contacts: IContactsModel;

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

  openDb: thunk(async (actions) => {
    const db = await openDatabase();
    actions.setDb(db);
    return db;
  }),

  initializeApp: thunk(async (actions, _, { getState, dispatch, injections }) => {
    log.d("getState().appReady: " + getState().appReady);
    if (getState().appReady) {
      log.d("App already initialized");
      return;
    }
    log.v("initializeApp()");

    const { initialize, checkStatus, startLnd } = injections.lndMobile.index;
    const db = await actions.openDb();
    if (!await getItemObjectAsyncStorage(StorageItem.app)) {
      log.i("Initializing app for the first time");
      if (PLATFORM === "ios" || PLATFORM === "macos") {
        log.i("Creating Application Support and lnd directories");
        await injections.lndMobile.index.createIOSApplicationSupportAndLndDirectories();
      }
      if (PLATFORM === "ios") {
        log.i("Excluding lnd directory from backup")
        await injections.lndMobile.index.excludeLndICloudBackup();
      }
      await setupApp();
      if (Chain === "regtest") {
        // await setupRegtest(
        //   await getItemAsyncStorage(StorageItem.bitcoindRpcHost) ?? "",
        //   await getItemAsyncStorage(StorageItem.bitcoindPubRawBlock) ?? "",
        //   await getItemAsyncStorage(StorageItem.bitcoindPubRawTx) ?? "",
        //   dispatch.settings.changeBitcoindRpcHost,
        //   dispatch.settings.changeBitcoindPubRawBlock,
        //   dispatch.settings.changeBitcoindPubRawTx,
        // );
        await setupRegtest2(
          dispatch.settings.changeNeutrinoPeers,
        );
      }
      log.i("Initializing db for the first time");
      try {
        await setupInitialSchema(db);
      } catch (error:any) {
        throw new Error("Error creating DB: " + error.message)
      }
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
      let torEnabled = await getItemObjectAsyncStorage<boolean>(StorageItem.torEnabled) ?? false;
      actions.setTorEnabled(torEnabled);
      let socksPort = 0;
      if (torEnabled) {
        try {
          actions.setTorLoading(true);
          if (PLATFORM === "android") {
            socksPort = await NativeModules.BlixtTor.startTor();
          } else if (PLATFORM === "ios") {
            const tor = Tor({
              stopDaemonOnBackground: false,
              startDaemonOnActive: true,
            });
            socksPort = await tor.startIfNotStarted();
          }
          log.i("socksPort", [socksPort]);
          if (socksPort === 0 && PLATFORM === "ios") {
            throw new Error("Unable to obtain SOCKS port");
          }
        } catch (e) {
          const restartText = "Restart app and try again with Tor";
          const continueText = "Continue without Tor";

          const buttons: AlertButton[] = [{
            text: continueText,
          }];
          if (PLATFORM === "android") {
            buttons.unshift({
              text: restartText,
            });
          }

          const result = await Alert.promiseAlert(
            "",
            "Tor failed to start.\nThe following error was returned:\n\n" + e.message,
            buttons,
          );

          if (result.text === restartText) {
            NativeModules.LndMobileTools.restartApp();
            return;
          } else {
            actions.setTorEnabled(false);
            torEnabled = false;
            actions.setTorLoading(false);
          }
        }
      }

      log.v("Running LndMobile.initialize()");
      const initReturn = await initialize();
      log.v("initialize done", [initReturn]);

      const status = await checkStatus();
      log.d("status", [status]);
      if ((status & ELndMobileStatusCodes.STATUS_PROCESS_STARTED) !== ELndMobileStatusCodes.STATUS_PROCESS_STARTED) {
        log.i("Starting lnd");
        try {
          let args = "";//--skip-chain-sync ";
          if (socksPort > 0) {
            args = "--tor.socks=127.0.0.1:" + socksPort + " ";
          }
          if (await getRescanWallet()) {
            args +=  "--reset-wallet-transactions ";
            await setRescanWallet(false);
          }

          log.d("startLnd", [
            await startLnd(torEnabled, args)
          ]);
        } catch (e) {
          if (e.message.includes("lnd already started")) {
            toast("lnd already started", 3000, "warning");
          } else {
            throw new Error("Failed to start lnd: " + e.message);
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
    } else if (PLATFORM === "ios" || PLATFORM === "macos") {
      await dispatch.iCloudBackup.initialize();
    }
    await dispatch.transaction.getTransactions();
    await dispatch.contacts.getContacts();
    await dispatch.channel.setupCachedBalance();
    log.d("Done starting up stores");

    const debugShowStartupInfo = getState().settings.debugShowStartupInfo;
    const start = new Date();
    LndMobileEventEmitter.addListener("SubscribeState", async (e: any) => {
      try {
        log.d("SubscribeState", [e]);
        const error = checkLndStreamErrorResponse("SubscribeState", e);
        if (error === "EOF") {
          return;
        } else if (error) {
          throw error;
        }

        const state = injections.lndMobile.index.decodeState(e.data ?? "");
        log.i("Current lnd state", [state]);
        if (state.state === lnrpc.WalletState.NON_EXISTING) {
          log.d("Got lnrpc.WalletState.NON_EXISTING");
        } else if (state.state === lnrpc.WalletState.LOCKED) {
          log.d("Got lnrpc.WalletState.LOCKED");
          log.d("Wallet locked, unlocking wallet");
          debugShowStartupInfo && toast("locked: " + (new Date().getTime() - start.getTime()) / 1000 + "s", 1000);
          await dispatch.unlockWallet();
        } else if (state.state === lnrpc.WalletState.UNLOCKED) {
          log.d("Got lnrpc.WalletState.UNLOCKED");
          debugShowStartupInfo && toast("unlocked: " + (new Date().getTime() - start.getTime()) / 1000 + "s", 1000);
        } else if (state.state === lnrpc.WalletState.RPC_ACTIVE) {
          debugShowStartupInfo && toast("RPC server active: " + (new Date().getTime() - start.getTime()) / 1000 + "s", 1000);
          await dispatch.lightning.initialize({ start });
          log.d("Got lnrpc.WalletState.RPC_ACTIVE");
        } else if (state.state === lnrpc.WalletState.SERVER_ACTIVE) {
          debugShowStartupInfo && toast("Service active: " + (new Date().getTime() - start.getTime()) / 1000 + "s", 1000);
          log.d("Got lnrpc.WalletState.SERVER_ACTIVE");

          // We'll enter this branch of code if the react-native frontend desyncs with lnd.
          // This can happen for example if Android kills react-native but not LndMobileService.
          if (!getState().lightning.rpcReady) {
            await dispatch.lightning.initialize({ start });
          }
        } else {
          log.d("Got unknown lnrpc.WalletState", [state.state])
        }
      } catch (error:any) {
        toast(error.message, undefined, "danger");
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
    actions.setAppVersion(appVersion);

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

  writeConfig: thunk(async (_, _2, { injections, getState }) => {
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
    const lndNoGraphCache = await getItemAsyncStorage(StorageItem.lndNoGraphCache) || "0";
    const strictGraphPruningEnabled = await getItemAsyncStorage(StorageItem.strictGraphPruningEnabled) || "0";

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

[db]
db.no-graph-cache=${lndNoGraphCache.toString()}

[Routing]
routing.assumechanvalid=1
routing.strictgraphpruning=${strictGraphPruningEnabled.toString()}

[Bitcoin]
bitcoin.active=1
bitcoin.${node}=1
bitcoin.node=${nodeBackend}
bitcoin.defaultchanconfs=1

${lndChainBackend === "neutrino" ? `
[Neutrino]
${neutrinoPeers[0] !== undefined ? `neutrino.connect=${neutrinoPeers[0]}` : ""}
neutrino.feeurl=${neutrinoFeeUrl}
neutrino.broadcasttimeout=11s
neutrino.persistfilters=true
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
autopilot.heuristic=externalscore:${Chain === "testnet" || Chain === "mainnet" ? "1.00" : "1.00"}
autopilot.heuristic=preferential:${Chain === "testnet" || Chain === "mainnet" ? "0.00" : "0.00"}

[protocol]
protocol.wumbo-channels=true
protocol.option-scid-alias=true
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
    let random = await generateSecureRandom(32);

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
  contacts,
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

function setupRegtest2(
  changeNeutrinoPeers: any
) {
  return new Promise((resolve, reject) => {
    Alert.prompt(
      "Set neutrino peer",
      "",
      async (text) => {
        if (text) {
          await changeNeutrinoPeers([text]);
          resolve(void(0))
        }
      },
      "plain-text"
    );
  });
}

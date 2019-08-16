import { NativeModules } from "react-native";
import { Thunk, thunk, Action, action } from "easy-peasy";
import { SQLiteDatabase } from "react-native-sqlite-storage";

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

import { clearApp, setupApp, getWalletCreated, StorageItem, getItemObject, setItemObject } from "../storage/app";
import { openDatabase, setupInitialSchema, deleteDatabase, dropTables } from "../storage/database/sqlite";
import { clearTransactions } from "../storage/database/transaction";

const { LndMobile } = NativeModules;

interface ICreateWalletPayload {
  password: string;
}

export interface IStoreModel {
  initializeApp: Thunk<IStoreModel, void, IStoreInjections, IStoreModel>;
  clearApp: Thunk<IStoreModel>;
  clearTransactions: Thunk<IStoreModel>;
  resetDb: Thunk<IStoreModel>;
  setDb: Action<IStoreModel, SQLiteDatabase>;
  setAppReady: Action<IStoreModel, boolean>;
  setWalletCreated: Action<IStoreModel, boolean>;
  setWalletSeed: Action<IStoreModel, string[] | undefined>;

  generateSeed: Thunk<IStoreModel, void, IStoreInjections>;
  createWallet: Thunk<IStoreModel, ICreateWalletPayload, IStoreInjections, IStoreModel>;

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
  walletSeed?: string[];
}

const model: IStoreModel = {
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

    actions.setWalletCreated(await getWalletCreated());

    try {
      console.log("init", await init());
      const status = await checkStatus();
      if ((status & LndMobile.STATUS_PROCESS_STARTED) !== LndMobile.STATUS_PROCESS_STARTED) {
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
    actions.setAppReady(true);

    console.log("App initialized");
    return true;
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
      await dropTables(db);
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
    const wallet = await initWallet(seed, payload.password);
    await setItemObject(StorageItem.walletCreated, true);
    actions.setWalletCreated(true);
    await dispatch.security.storeSeed(seed);
    setTimeout(() => actions.setWalletSeed(undefined), 20000);
    return wallet;
  }),

  setWalletCreated: action((state, payload) => { state.walletCreated = payload; }),
  setDb: action((state, db) => { state.db = db; }),
  setAppReady: action((state, value) => { state.appReady = value; }),

  appReady: false,
  walletCreated: false,

  lightning,
  transaction,
  channel,
  send,
  receive,
  onChain,
  fiat,
  security,
  settings,
};

export default model;

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

  createWallet: Thunk<IStoreModel, ICreateWalletPayload, IStoreInjections>;

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
      actions.setAppReady(true);
    }
    catch (e) {
      console.log("Exception", e);
      throw e;
    }

    dispatch.fiat.getRate();

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

  createWallet: thunk(async (actions, payload, { injections }) => {
    const { genSeed, initWallet } = injections.lndMobile.wallet;
    const seed = await genSeed();
    const wallet = await initWallet(seed.cipherSeedMnemonic, payload.password);
    await setItemObject(StorageItem.walletCreated, true);
    actions.setWalletCreated(true);
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
};

export default model;

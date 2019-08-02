import { AppState, NativeModules } from "react-native";
import { Thunk, thunk, Action, action } from "easy-peasy";
import { SQLiteDatabase } from "react-native-sqlite-storage";

import { lightning, ILightningModel } from "./Lightning";
import { transaction, ITransactionModel } from "./Transaction";
import { channel, IChannelModel } from "./Channel";
import { ISendModel, send } from "./Send";

import { IApp, getApp, clearApp, setupApp, setApp } from "../storage/app";
import { openDatabase, setupInitialSchema, deleteDatabase, dropTables } from "../storage/database/sqlite";
import { clearTransactions } from "../storage/database/transaction";
import { genSeed, initWallet } from "../lndmobile/wallet";

const { LndMobile } = NativeModules;


interface ICreateWalletPayload {
  password: string;
}

export interface IStoreModel {
  initializeApp: Thunk<IStoreModel>;
  clearApp: Thunk<IStoreModel>;
  clearTransactions: Thunk<IStoreModel>;
  resetDb: Thunk<IStoreModel>;
  setDb: Action<IStoreModel, SQLiteDatabase>;
  setApp: Action<IStoreModel, IApp>;
  setLndReady: Action<IStoreModel, boolean>;

  createWallet: Thunk<IStoreModel, ICreateWalletPayload>;
  setWalletCreated: Thunk<IStoreModel, boolean>;

  app?: IApp;
  db?: SQLiteDatabase;
  lndReady: boolean;
  lightning: ILightningModel;
  transaction: ITransactionModel;
  channel: IChannelModel;
  send: ISendModel;
}

const timeout = (time: number) => new Promise((resolve) => setTimeout(() => resolve(), time));

const model: IStoreModel = {
  initializeApp: thunk(async (actions, _, { getState, dispatch }) => {
    if (getState().app) {
      console.warn("App already initialized");
      return;
    }

    let app = await getApp();
    const db = await openDatabase();
    actions.setDb(db);

    if (!app) {
      console.log("Initializing app for the first time");
      app = await setupApp();
      console.log("Initializing db for the first time");
      await setupInitialSchema(db);
      console.log("Writing lnd.conf");
      await NativeModules.LndMobile.writeConfigFile();

      actions.lightning.setFirstSync(true);
    }
    actions.setApp(app as IApp);
    try {
      console.log(await NativeModules.LndMobile.init());
      const status = await NativeModules.LndMobile.checkStatus();
      if ((status & LndMobile.STATUS_PROCESS_STARTED) !== LndMobile.STATUS_PROCESS_STARTED) {
        console.log("lnd not started, starting lnd");
        console.log(await NativeModules.LndMobile.startLnd());
      }
      actions.setLndReady(true);
    }
    catch (e) { console.log("Exception", e); }

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

  setDb: action((state, db) => { state.db = db; }),
  setApp: action((state, app) => { state.app = app; }),
  setLndReady: action((state, value) => { state.lndReady = value; }),

  createWallet: thunk(async (actions, payload) => {
    const seed = await genSeed();
    const wallet = await initWallet(seed.cipherSeedMnemonic, payload.password);
    actions.setWalletCreated(true);
    return wallet;
  }),

  setWalletCreated: thunk(async (actions, payload) => {
    const app = await getApp();
    if (!app) {
      return;
    }
    await setApp({ ...app, walletCreated: true });
    actions.setApp(app);
  }),

  app: undefined,
  db: undefined,
  lndReady: false,
  lightning,
  transaction,
  channel,
  send,
};

export default model;

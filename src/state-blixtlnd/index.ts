import { AppState, NativeModules } from "react-native";
import { lightning, ILightningModel } from "./Lightning";
import { transaction, ITransactionModel } from "./Transaction";
import { channel, IChannelModel } from "./Channel";
import { Thunk, thunk, Action, action } from "easy-peasy";
import { SQLiteDatabase } from "react-native-sqlite-storage";
import { IApp, getApp, clearApp, setupApp, setApp } from "../storage/app";
import { openDatabase, setupInitialSchema, deleteDatabase, dropTables } from "../storage/database/sqlite";
import { clearTransactions } from "../storage/database/transaction";

import {closeOverlay, openOverlay} from '../Blur';
import { unlockWallet, getInfo } from "../lightning";
//import {closeOverlay, openOverlay} from 'react-native-blur-overlay';

export interface IStoreModel {
  initializeApp: Thunk<IStoreModel>;
  clearApp: Thunk<IStoreModel>;
  clearTransactions: Thunk<IStoreModel>;
  resetDb: Thunk<IStoreModel>;
  setDb: Action<IStoreModel, SQLiteDatabase>;
  setApp: Action<IStoreModel, IApp>;
  setLndReady: Action<IStoreModel, boolean>;
  setChangeSubscriptionStarted: Action<IStoreModel, boolean>;
  setLndRestarting: Action<IStoreModel, boolean>;

  setWalletCreated: Thunk<IStoreModel, boolean>;

  app?: IApp;
  db?: SQLiteDatabase;
  lndReady: boolean;
  changeSubscriptionStarted: boolean;
  lndRestarting: boolean;
  lightning: ILightningModel;
  transaction: ITransactionModel;
  channel: IChannelModel;
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
      await NativeModules.LndProcessStarter.writeConfigFile();
    }
    actions.setApp(app as IApp);
    try {
      console.log(await NativeModules.LndMobile.init());
      console.log(await NativeModules.LndMobile.startLnd());
      actions.setLndReady(true);
    }
    catch (e) { console.log("Exception", e); }

    // let gotCertificate = false;
    // do {
    //   gotCertificate = await NativeModules.LndGrpc.readCertificate();
    //   if (!gotCertificate) {
    //     await timeout(500);
    //   }
    // } while (!gotCertificate);

    // if (!getState().changeSubscriptionStarted) {
    //   AppState.addEventListener("change", async (e) => {
    //     console.log("CHANGE");
    //     if (e === "active") {
    //       console.log("active");
    //       if (await NativeModules.LndProcessStarter.startProcess()) {
    //         openOverlay();
    //         actions.setLndRestarting(true);
    //         await dispatch.lightning.initialize();
    //         closeOverlay();
    //         actions.setLndRestarting(false);
    //       }
    //     }
    //     if (e === "background") {
    //       console.log("background");
    //     }
    //     else {
    //       console.log(e);
    //     }
    //   });
    //   actions.setChangeSubscriptionStarted(true);
    // }

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
    await dropTables(db);
    await setupInitialSchema(db);
  }),

  setDb: action((state, db) => { state.db = db; }),
  setApp: action((state, app) => { state.app = app; }),
  setLndReady: action((state, value) => { state.lndReady = value; }),
  setChangeSubscriptionStarted: action((state, payload) => { state.changeSubscriptionStarted = payload; }),
  setLndRestarting: action((state, payload) => { state.lndRestarting = payload; }),

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
  changeSubscriptionStarted: false,
  lndRestarting: false,
  lightning,
  transaction,
  channel,
};

export default model;

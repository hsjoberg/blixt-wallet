import { AppState, NativeModules } from "react-native";
import { lightning, ILightningModel } from "./Lightning";
import { transaction, ITransactionModel } from "./Transaction";
import { channel, IChannelModel } from "./Channel";
import { Thunk, thunk, Action, action } from "easy-peasy";
import { SQLiteDatabase } from "react-native-sqlite-storage";
import { IApp, getApp, clearApp, setupApp, setApp } from "../storage/app";
import { openDatabase, setupInitialSchema, deleteDatabase } from "../storage/database/sqlite";

export interface IStoreModel {
  initializeApp: Thunk<IStoreModel>;
  clearApp: Thunk<IStoreModel>;
  setDb: Action<IStoreModel, SQLiteDatabase>;
  setApp: Action<IStoreModel, IApp>;
  setChangeSubscriptionStarted: Action<IStoreModel, boolean>;

  setWalletCreated: Thunk<IStoreModel, boolean>;

  app?: IApp;
  db?: SQLiteDatabase;
  changeSubscriptionStarted: boolean;
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

    // Start lnd here
    await NativeModules.LndProcessStarter.startProcess();

    let gotCertificate = false;
    do {
      gotCertificate = await NativeModules.LndGrpc.readCertificate();
      if (!gotCertificate) {
        await timeout(500);
      }
    } while (!gotCertificate);

    if (!getState().changeSubscriptionStarted) {
      AppState.addEventListener("change", async (e) => {
        console.log("CHANGE");
        if (e === "active") {
          console.log("active");
          if (await NativeModules.LndProcessStarter.startProcess()) {
            await dispatch.lightning.initialize();
          }
        }
        if (e === "background") {
          console.log("background");
        }
        else {
          console.log(e);
        }
      });
      actions.setChangeSubscriptionStarted(true);
    }

    console.log("App initialized");
    return true;
  }),
  clearApp: thunk(async () => {
    await clearApp();
    await deleteDatabase();
  }),

  setDb: action((state, db) => { state.db = db; }),
  setApp: action((state, app) => { state.app = app; }),
  setChangeSubscriptionStarted: action((state, payload) => { state.changeSubscriptionStarted = payload; }),

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
  changeSubscriptionStarted: false,
  lightning,
  transaction,
  channel,
};

export default model;

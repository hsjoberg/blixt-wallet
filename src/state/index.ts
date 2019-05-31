import lightning, { ILightningModel } from "./Lightning";
import { Thunk, thunk, Action, action } from "easy-peasy";
import { SQLiteDatabase } from "react-native-sqlite-storage";
import { IApp, getApp, clearApp, setupApp } from "../storage/app";
import { openDatabase, setupInitialSchema, deleteDatabase } from "../storage/database/sqlite";
import { transaction, ITransactionModel } from "./Transaction";

export interface IStoreModel {
  initializeApp: Thunk<IStoreModel>;
  clearApp: Thunk<IStoreModel>;
  setDb: Action<IStoreModel, SQLiteDatabase>;
  setApp: Action<IStoreModel, IApp>;

  app?: IApp;
  db?: SQLiteDatabase;
  lightning: ILightningModel;
  transaction: ITransactionModel;
}

const model: IStoreModel = {
  initializeApp: thunk(async (actions) => {
    let app = await getApp();
    const db = await openDatabase();
    actions.setDb(db);

    if (!app) {
      console.log("Initializing app for the first time");
      app = await setupApp();
      console.log("Initializing db for the first time");
      await setupInitialSchema(db);
    }
    actions.setApp(app as IApp);
    console.log("App initialized");
    return true;
  }),
  clearApp: thunk(async () => {
    await clearApp();
    await deleteDatabase();
  }),

  setDb: action((state, db) => { state.db = db; }),
  setApp: action((state, app) => { state.app = app; }),

  app: undefined,
  db: undefined,
  lightning,
  transaction,
};

export default model;

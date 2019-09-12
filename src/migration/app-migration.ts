import { NativeModules } from "react-native";
import { SQLiteDatabase } from "react-native-sqlite-storage";
import { getWalletCreated, StorageItem, getItemObject, setItemObject, setItem, getItem } from "../storage/app";
import { getPin, getSeed, removeSeed, setSeed, setPin, removePin } from "../storage/keystore";
const { LndMobile } = NativeModules;

export interface IAppMigration {
  beforeLnd: (db: SQLiteDatabase, currentVersion: number) => Promise<void>;
}

export const appMigration: IAppMigration[] = [
  // Version 0
  {
    async beforeLnd(db, i) {},
  },
  {
    async beforeLnd(db, i) {
      await LndMobile.writeConfigFile();
    },
  }
];

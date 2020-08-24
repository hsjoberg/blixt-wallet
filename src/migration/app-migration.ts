import { NativeModules } from "react-native";
import { SQLiteDatabase } from "react-native-sqlite-storage";
import { getWalletCreated, StorageItem, getItemObject, setItemObject, setItem, getItem } from "../storage/app";
import { getPin, getSeed, removeSeed, setSeed, setPin, removePin, setWalletPassword } from "../storage/keystore";
const { LndMobile } = NativeModules;

export interface IAppMigration {
  beforeLnd: (db: SQLiteDatabase, currentVersion: number) => Promise<void>;
}

export const appMigration: IAppMigration[] = [
  // Version 0
  {
    async beforeLnd(db, i) { },
  },
  // Version 1
  {
    async beforeLnd(db, i) {
      await LndMobile.writeConfigFile();
    },
  },
  // Version 2
  {
    async beforeLnd(db, i) {
      await setItemObject(StorageItem.clipboardInvoiceCheck, true);
      await LndMobile.writeConfigFile();
    },
  },
  // Version 3
  {
    async beforeLnd(db, i) {
      await NativeModules.LndMobileScheduledSync.setupScheduledSyncWork();
      await setItemObject(StorageItem.scheduledSyncEnabled, true);
      await setItemObject(StorageItem.lastScheduledSync, 0);
      await setItemObject(StorageItem.lastScheduledSyncAttempt, 0);
    },
  },
  // Version 4
  {
    async beforeLnd(db, i) {
      // Might not be needed:
      // const result = await NativeModules.LndMobile.deleteTLSCerts();
      // if (!result) {
      //   throw new Error("Failed to delete TLS certificates");
      // }
      await setItemObject(StorageItem.debugShowStartupInfo, false);
    },
  },
  // Version 5
  {
    async beforeLnd(db, i) {
      await db.executeSql("ALTER TABLE tx ADD tlvRecordName STRING");
    },
  },
  // Version 6
  {
    async beforeLnd(db, i) {
      await db.executeSql("ALTER TABLE tx ADD locationLong REAL");
      await db.executeSql("ALTER TABLE tx ADD locationLat REAL");
    },
  },
  // Version 7
  {
    async beforeLnd(db, i) {
      const password = await getItem(StorageItem.walletPassword);
      if (!password) {
        console.log("Cannot find wallet password");
        return;
      }

      await setWalletPassword(password);
    },
  },
  // Version 8
  {
    async beforeLnd(db, i) {
      await db.executeSql("ALTER TABLE tx ADD website TEXT NULL");
      await db.executeSql("ALTER TABLE tx ADD type TEXT NOT NULL DEFAULT 'NORMAL'");
    },
  },
  // Version 9
  {
    async beforeLnd(db, i) {
      await setItem(StorageItem.onchainExplorer, "mempool");
    },
  },
  // Version 10
  {
    async beforeLnd(db, i) {
      await db.executeSql("ALTER TABLE tx ADD preimage TEXT NOT NULL DEFAULT '00'"); // hex string
      await db.executeSql("ALTER TABLE tx ADD lnurlPayResponse TEXT NULL");
    },
  },
  // Version 11
  {
    async beforeLnd(db, i) {
      await LndMobile.writeConfigFile();
    },
  },
  // Version 12
  {
    async beforeLnd(db, i) {
      await setItemObject(StorageItem.multiPathPaymentsEnabled, false);
    },
  },
  // Version 13
  {
    async beforeLnd(db, i) {
      await setItem(StorageItem.onboardingState, "DONE");
    },
  },
  // Version 14
  {
    async beforeLnd(db, i) {
      await setItemObject(StorageItem.torEnabled, false);
    },
  },
  // Version 15
  {
    async beforeLnd(db, i) {
      await LndMobile.writeConfigFile();
    },
  },
  // Version 16
  {
    async beforeLnd(db, i) {
      await setItemObject<number>(StorageItem.lastGoogleDriveBackup, 0);
    },
  },
  // Version 17
  {
    async beforeLnd(db, i) {
      await db.executeSql("ALTER TABLE tx ADD identifiedService TEXT NULL");
      await setItemObject<boolean>(StorageItem.hideExpiredInvoices, true);
      await setItemObject<number>(StorageItem.lastGoogleDriveBackup, new Date().getTime());
      await LndMobile.writeConfigFile();
    },
  },
  // Version 18
  {
    async beforeLnd(db, i) {
      await setItemObject<boolean>(StorageItem.screenTransitionsEnabled, true);
    },
  },
];
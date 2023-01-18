import { NativeModules } from "react-native";
import { SQLiteDatabase } from "react-native-sqlite-storage";
import { LndChainBackend } from "../state/Lightning";
import { getWalletCreated, StorageItem, getItemObject, setItemObject, setItem, getItem } from "../storage/app";
import { getPin, getSeed, removeSeed, setSeed, setPin, removePin, setWalletPassword } from "../storage/keystore";
import { Chain } from "../utils/build";
import { DEFAULT_DUNDER_SERVER, DEFAULT_NEUTRINO_NODE } from "../utils/constants";
const { LndMobile, LndMobileTools } = NativeModules;

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
      await LndMobileTools.writeConfigFile();
    },
  },
  // Version 2
  {
    async beforeLnd(db, i) {
      await setItemObject(StorageItem.clipboardInvoiceCheck, true);
      await LndMobileTools.writeConfigFile();
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
      // const result = await NativeModules.LndMobileTools.deleteTLSCerts();
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
      await LndMobileTools.writeConfigFile();
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
      await LndMobileTools.writeConfigFile();
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
      await LndMobileTools.writeConfigFile();
    },
  },
  // Version 18
  {
    async beforeLnd(db, i) {
      await setItemObject<boolean>(StorageItem.screenTransitionsEnabled, true);
    },
  },
  // Version 19
  {
    async beforeLnd(db, i) {
      await db.executeSql("ALTER TABLE tx ADD note TEXT NULL");
    },
  },
  // Version 20
  {
    async beforeLnd(db, i) {
      await setItemObject<number>(StorageItem.lastICloudBackup, new Date().getTime());
    },
  },
  // Version 21
  {
    async beforeLnd(db, i) {
      let lndChainBackend: LndChainBackend = "neutrino";
      let neutrinoPeers: string[] = [];
      let neutrinoFeeUrl = "";
      if (Chain === "mainnet" || Chain === "testnet") {
        lndChainBackend = "neutrino";
        neutrinoPeers.push(DEFAULT_NEUTRINO_NODE);
        neutrinoFeeUrl = "https://nodes.lightning.computer/fees/v1/btc-fee-estimates.json";
      }

      let bitcoindRpcHost = "";
      let bitcoindRpcUser = "";
      let bitcoindRpcPass = "";
      let bitcoindPubRawBlock = "";
      let bitcoindPubRawTx = "";
      if (Chain === "regtest") {
        lndChainBackend = "bitcoindWithZmq";
        bitcoindRpcHost = "192.168.1.113:18443";
        bitcoindRpcUser = "polaruser";
        bitcoindRpcPass = "polarpass";
        bitcoindPubRawBlock = "192.168.1.113:28334";
        bitcoindPubRawTx = "192.168.1.113:29335";
      }

      await setItem(StorageItem.lndChainBackend, lndChainBackend);
      await setItemObject<string[]>(StorageItem.neutrinoPeers, neutrinoPeers);
      await setItem(StorageItem.neutrinoFeeUrl, neutrinoFeeUrl);
      await setItem(StorageItem.bitcoindRpcHost, bitcoindRpcHost);
      await setItem(StorageItem.bitcoindRpcUser, bitcoindRpcUser);
      await setItem(StorageItem.bitcoindRpcPass, bitcoindRpcPass);
      await setItem(StorageItem.bitcoindPubRawBlock, bitcoindPubRawBlock);
      await setItem(StorageItem.bitcoindPubRawTx, bitcoindPubRawTx);
    },
  },
  // Version 22
  {
    async beforeLnd(db, i) {
      if (Chain === "testnet") {
        await setItemObject<string[]>(StorageItem.neutrinoPeers, [DEFAULT_NEUTRINO_NODE]);
      }
    },
  },
  // Version 23
  {
    async beforeLnd(db, i) {
      if (Chain === "mainnet") {
        if ((await getItemObject<string[]>(StorageItem.neutrinoPeers))[0] === "btcd-mainnet.lightning.computer") {
          await setItemObject<string[]>(StorageItem.neutrinoPeers, [DEFAULT_NEUTRINO_NODE]);
        }
      }
    },
  },
  // Version 24
  {
    async beforeLnd(db, i) {
      await setItem(StorageItem.dunderServer, DEFAULT_DUNDER_SERVER);
    },
  },
  // Version 25
  {
    async beforeLnd(db, i) {
      if (Chain === "testnet") {
        await setItemObject<string[]>(StorageItem.neutrinoPeers, [DEFAULT_NEUTRINO_NODE]);
      }
    },
  },
  // Version 26
  {
    async beforeLnd(db, i) {
      await setItemObject<boolean>(StorageItem.requireGraphSync, false);
    },
  },
  // Version 27
  {
    async beforeLnd(db, i) {
      await setItemObject<boolean>(StorageItem.dunderEnabled, false);
    },
  },
  // Version 28
  {
    async beforeLnd(db, i) {
      await db.executeSql(
        `CREATE TABLE contact (
          id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
          domain TEXT NOT NULL,
          type TEXT NOT NULL,
          lightningAddress TEXT NULL,
          lud16IdentifierMimeType TEXT NULL,
          lnUrlPay TEXT NULL,
          lnUrlWithdraw TEXT NULL,
          note TEXT NOT NULL
        )`
      );
      await db.executeSql("ALTER TABLE tx ADD lightningAddress TEXT NULL");
      await db.executeSql("ALTER TABLE tx ADD lud16IdentifierMimeType TEXT NULL");
    },
  },
  // Version 29
  {
    async beforeLnd(db, i) {
      setItemObject<boolean>(StorageItem.lndNoGraphCache, false);
    },
  },
  // Version 30
  {
    async beforeLnd(db, i) {
      setItemObject<boolean>(StorageItem.multiPathPaymentsEnabled, true);
    },
  },
  // Version 31
  {
    async beforeLnd(db, i) {
      setItemObject<boolean>(StorageItem.strictGraphPruningEnabled, false);
    },
  },
  // Version 32
  {
    async beforeLnd(db, i) {
      await db.executeSql("ALTER TABLE tx ADD duration REAL NULL");
    },
  },
  // Version 33
  {
    async beforeLnd(db, i) {
      setItemObject<boolean>(StorageItem.persistentServices, false);
    },
  },
];

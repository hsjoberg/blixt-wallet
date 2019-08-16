import AsyncStorage from "@react-native-community/async-storage";

export enum StorageItem { // const enums not supported in Babel 7...
  app = "app",
  dbVersion = "dbVersion",
  databaseCreated = "databaseCreated",
  walletCreated = "walletCreated",
  firstSync = "firstSync",
  timeSinceLastSync = "timeSinceLastSync",
  lightningBalance = "lightningBalance",
  loginMethods = "loginMethods",
  pincode = "pincode",
  seedStored = "seedStored",
  seed = "seed",
  bitcoinUnit = "bitcoinUnit", // bitcoin, satoshi, bits, millisatoshi
}

export const setItem = async (key: string, value: string) => await AsyncStorage.setItem(key, value);
export const setItemObject = async (key: string, value: any) => await AsyncStorage.setItem(key, JSON.stringify(value));
export const getItem = async (key: StorageItem) => await AsyncStorage.getItem(key);
export const getItemObject = async (key: StorageItem) => JSON.parse(await AsyncStorage.getItem(key) || "null");
export const removeItem = async (key: StorageItem) => await AsyncStorage.removeItem(key);

export const getDbVersion = async (): Promise<number> => {
  return await getItemObject(StorageItem.dbVersion) || 0;
};

export const getWalletCreated = async (): Promise<boolean> => {
  return await getItemObject(StorageItem.walletCreated) || false;
};

export const clearApp = async () => {
  await Promise.all([
    removeItem(StorageItem.app),
    removeItem(StorageItem.dbVersion),
    removeItem(StorageItem.walletCreated),
    removeItem(StorageItem.firstSync),
    removeItem(StorageItem.timeSinceLastSync),
    removeItem(StorageItem.loginMethods),
    removeItem(StorageItem.pincode),
    removeItem(StorageItem.seedStored),
    removeItem(StorageItem.seed),
    removeItem(StorageItem.bitcoinUnit),
  ]);
};

export const setupApp = async () => {
  await Promise.all([
    setItemObject(StorageItem.app, true),
    setItemObject(StorageItem.dbVersion, 1),
    setItemObject(StorageItem.walletCreated, false),
    setItemObject(StorageItem.firstSync, true),
    setItemObject(StorageItem.timeSinceLastSync, 0),
    setItemObject(StorageItem.loginMethods, []),
    setItemObject(StorageItem.bitcoinUnit, "bitcoin"),
    // Pincode
    // seedStored
    // seed
  ]);
};

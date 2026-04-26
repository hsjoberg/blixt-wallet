import type { AdditionalElectrobunHandlers } from "react-native-turbo-lnd/electrobun/bun-rpc-factory";
import {
  BlixtCachePath,
  BlixtKvPath,
  BlixtLndConfigPath,
  BlixtLndPath,
  BlixtRootPath,
  BlixtSqlitePath,
  normalizeFsPath,
} from "./BlixtPaths";
import { createFileKeystoreStore } from "./keystore/KeystoreStore.file";
import { createLinuxKeystoreStore } from "./keystore/KeystoreStore.linux";
import { createWindowsKeystoreStore } from "./keystore/KeystoreStore.windows";

const createKeystoreStore = () => {
  if (process.platform === "win32") {
    return createWindowsKeystoreStore();
  }

  const fileStore = createFileKeystoreStore();
  if (process.platform === "linux") {
    return createLinuxKeystoreStore(fileStore);
  }

  return fileStore;
};

const keystoreStore = createKeystoreStore();

export const createKeystoreElectrobunHandlers = (): AdditionalElectrobunHandlers<any> => {
  return {
    requests: {
      __BlixtGetPaths: async () => {
        return {
          rootPath: normalizeFsPath(BlixtRootPath),
          lndPath: normalizeFsPath(BlixtLndPath),
          lndConfigPath: normalizeFsPath(BlixtLndConfigPath),
          cachePath: normalizeFsPath(BlixtCachePath),
          sqlitePath: normalizeFsPath(BlixtSqlitePath),
          kvPath: normalizeFsPath(BlixtKvPath),
          keystorePath: normalizeFsPath(keystoreStore.path),
        };
      },

      __BlixtKeystoreGetItem: async ({ key }: { key: string }) => {
        if (typeof key !== "string") {
          throw new Error("Invalid keystore getItem payload.");
        }

        const store = keystoreStore.load();
        return Object.prototype.hasOwnProperty.call(store, key) ? store[key] : null;
      },

      __BlixtKeystoreGetAllItems: async () => {
        return {
          ...keystoreStore.load(),
        };
      },

      __BlixtKeystoreSetItem: async ({ key, value }: { key: string; value: string }) => {
        if (typeof key !== "string" || typeof value !== "string") {
          throw new Error("Invalid keystore setItem payload.");
        }

        keystoreStore.persist({
          ...keystoreStore.load(),
          [key]: value,
        });
        return true;
      },

      __BlixtKeystoreRemoveItem: async ({ key }: { key: string }) => {
        if (typeof key !== "string") {
          throw new Error("Invalid keystore removeItem payload.");
        }

        const nextStore = {
          ...keystoreStore.load(),
        };
        delete nextStore[key];
        keystoreStore.persist(nextStore);
        return true;
      },
    },
  };
};

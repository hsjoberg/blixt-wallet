import { readFileSync, writeFileSync } from "node:fs";
import type { AdditionalElectrobunHandlers } from "react-native-turbo-lnd/electrobun/bun-rpc-factory";
import {
  BlixtCachePath,
  BlixtKeystorePath,
  BlixtKvPath,
  BlixtLndConfigPath,
  BlixtLndPath,
  BlixtRootPath,
  BlixtSqlitePath,
  normalizeFsPath,
} from "./BlixtPaths";

let keystoreCache: Record<string, string> | null = null;

const loadKeystore = (): Record<string, string> => {
  if (keystoreCache !== null) {
    return keystoreCache;
  }

  try {
    const parsed = JSON.parse(readFileSync(BlixtKeystorePath, "utf8"));
    if (parsed && typeof parsed === "object") {
      keystoreCache = Object.fromEntries(
        Object.entries(parsed as Record<string, unknown>).map(([key, value]) => [
          key,
          typeof value === "string" ? value : JSON.stringify(value),
        ]),
      );
      return keystoreCache;
    }
  } catch (_error) {}

  keystoreCache = {};
  return keystoreCache;
};

const persistKeystore = (nextStore: Record<string, string>) => {
  keystoreCache = nextStore;
  writeFileSync(BlixtKeystorePath, JSON.stringify(nextStore), "utf8");
};

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
          keystorePath: normalizeFsPath(BlixtKeystorePath),
        };
      },

      __BlixtKeystoreGetItem: async ({ key }: { key: string }) => {
        if (typeof key !== "string") {
          throw new Error("Invalid keystore getItem payload.");
        }

        const store = loadKeystore();
        return Object.prototype.hasOwnProperty.call(store, key) ? store[key] : null;
      },

      __BlixtKeystoreGetAllItems: async () => {
        return {
          ...loadKeystore(),
        };
      },

      __BlixtKeystoreSetItem: async ({ key, value }: { key: string; value: string }) => {
        if (typeof key !== "string" || typeof value !== "string") {
          throw new Error("Invalid keystore setItem payload.");
        }

        persistKeystore({
          ...loadKeystore(),
          [key]: value,
        });
        return true;
      },

      __BlixtKeystoreRemoveItem: async ({ key }: { key: string }) => {
        if (typeof key !== "string") {
          throw new Error("Invalid keystore removeItem payload.");
        }

        const nextStore = {
          ...loadKeystore(),
        };
        delete nextStore[key];
        persistKeystore(nextStore);
        return true;
      },
    },
  };
};

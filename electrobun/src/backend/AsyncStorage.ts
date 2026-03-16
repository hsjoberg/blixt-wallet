import { readFileSync, writeFileSync } from "node:fs";
import type { AdditionalElectrobunHandlers } from "react-native-turbo-lnd/electrobun/bun-rpc-factory";
import { BlixtKvPath } from "./BlixtPaths";

let kvStoreCache: Record<string, string> | null = null;

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === "object" && !Array.isArray(value);

const deepMergeJson = (baseValue: unknown, patchValue: unknown): unknown => {
  if (!isPlainObject(baseValue) || !isPlainObject(patchValue)) {
    return patchValue;
  }

  const output: Record<string, unknown> = {
    ...baseValue,
  };

  for (const [key, value] of Object.entries(patchValue)) {
    output[key] = key in output ? deepMergeJson(output[key], value) : value;
  }

  return output;
};

const mergeJsonStrings = (baseRaw: string | null, patchRaw: string): string => {
  try {
    const baseParsed = baseRaw === null ? {} : JSON.parse(baseRaw);
    const patchParsed = JSON.parse(patchRaw);
    return JSON.stringify(deepMergeJson(baseParsed, patchParsed));
  } catch (_error) {
    return patchRaw;
  }
};

const loadKvStore = (): Record<string, string> => {
  if (kvStoreCache !== null) {
    return kvStoreCache;
  }

  try {
    const parsed = JSON.parse(readFileSync(BlixtKvPath, "utf8"));
    if (parsed && typeof parsed === "object") {
      kvStoreCache = Object.fromEntries(
        Object.entries(parsed as Record<string, unknown>).map(([key, value]) => [
          key,
          typeof value === "string" ? value : JSON.stringify(value),
        ]),
      );
      return kvStoreCache;
    }
  } catch (_error) {}

  kvStoreCache = {};
  return kvStoreCache;
};

const persistKvStore = (nextStore: Record<string, string>) => {
  kvStoreCache = nextStore;
  writeFileSync(BlixtKvPath, JSON.stringify(nextStore), "utf8");
};

export const createAsyncStorageElectrobunHandlers = (): AdditionalElectrobunHandlers<any> => {
  return {
    requests: {
      __BlixtKvGetItem: async ({ key }: { key: string }) => {
        if (typeof key !== "string") {
          throw new Error("Invalid KV getItem payload.");
        }
        const store = loadKvStore();
        return Object.prototype.hasOwnProperty.call(store, key) ? store[key] : null;
      },

      __BlixtKvSetItem: async ({ key, value }: { key: string; value: string }) => {
        if (typeof key !== "string" || typeof value !== "string") {
          throw new Error("Invalid KV setItem payload.");
        }

        persistKvStore({
          ...loadKvStore(),
          [key]: value,
        });
        return true;
      },

      __BlixtKvRemoveItem: async ({ key }: { key: string }) => {
        if (typeof key !== "string") {
          throw new Error("Invalid KV removeItem payload.");
        }

        const nextStore = {
          ...loadKvStore(),
        };
        delete nextStore[key];
        persistKvStore(nextStore);
        return true;
      },

      __BlixtKvClear: async () => {
        persistKvStore({});
        return true;
      },

      __BlixtKvGetAllKeys: async () => {
        return Object.keys(loadKvStore());
      },

      __BlixtKvMultiGet: async ({ keys }: { keys: string[] }) => {
        if (!Array.isArray(keys)) {
          throw new Error("Invalid KV multiGet payload.");
        }

        const store = loadKvStore();
        return keys.map((key) => [
          key,
          Object.prototype.hasOwnProperty.call(store, key) ? store[key] : null,
        ]);
      },

      __BlixtKvMultiSet: async ({ entries }: { entries: Array<[string, string]> }) => {
        if (!Array.isArray(entries)) {
          throw new Error("Invalid KV multiSet payload.");
        }

        const nextStore = {
          ...loadKvStore(),
        };

        for (const [key, value] of entries) {
          if (typeof key !== "string" || typeof value !== "string") {
            throw new Error("Invalid KV multiSet entry.");
          }
          nextStore[key] = value;
        }

        persistKvStore(nextStore);
        return true;
      },

      __BlixtKvMultiRemove: async ({ keys }: { keys: string[] }) => {
        if (!Array.isArray(keys)) {
          throw new Error("Invalid KV multiRemove payload.");
        }

        const nextStore = {
          ...loadKvStore(),
        };
        for (const key of keys) {
          delete nextStore[key];
        }

        persistKvStore(nextStore);
        return true;
      },

      __BlixtKvMergeItem: async ({ key, value }: { key: string; value: string }) => {
        if (typeof key !== "string" || typeof value !== "string") {
          throw new Error("Invalid KV mergeItem payload.");
        }

        const store = loadKvStore();
        persistKvStore({
          ...store,
          [key]: mergeJsonStrings(store[key] ?? null, value),
        });
        return true;
      },

      __BlixtKvMultiMerge: async ({ entries }: { entries: Array<[string, string]> }) => {
        if (!Array.isArray(entries)) {
          throw new Error("Invalid KV multiMerge payload.");
        }

        const nextStore = {
          ...loadKvStore(),
        };

        for (const [key, value] of entries) {
          if (typeof key !== "string" || typeof value !== "string") {
            throw new Error("Invalid KV multiMerge entry.");
          }

          nextStore[key] = mergeJsonStrings(nextStore[key] ?? null, value);
        }

        persistKvStore(nextStore);
        return true;
      },
    },
  };
};

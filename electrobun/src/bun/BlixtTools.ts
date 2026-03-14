import { randomBytes } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { Database as BunSqliteDatabase } from "bun:sqlite";
import type { AdditionalElectrobunHandlers } from "react-native-turbo-lnd/electrobun/bun-rpc-factory";

const BlixtRootPath = path.resolve(os.homedir(), ".blixt");
const BlixtLndPath = path.resolve(BlixtRootPath, "lnd");
const BlixtLndConfigPath = path.resolve(BlixtLndPath, "lnd.conf");
const BlixtCachePath = path.resolve(BlixtRootPath, "cache");
const BlixtSqlitePath = path.resolve(BlixtRootPath, "sqlite.db");
const BlixtKvPath = path.resolve(BlixtRootPath, "kv.json");

const sqliteDatabaseMap = new Map<string, BunSqliteDatabase>();
let nextDatabaseId = 1;
let kvStoreCache: Record<string, string> | null = null;

const normalizeFsPath = (targetPath: string) => targetPath.replaceAll("\\", "/");

const ensureDirectory = (targetPath: string) => {
  if (!existsSync(targetPath)) {
    mkdirSync(targetPath, { recursive: true });
  }
};

const ensureBlixtPaths = () => {
  ensureDirectory(BlixtRootPath);
  ensureDirectory(BlixtLndPath);
  ensureDirectory(BlixtCachePath);
};

const loadKvStore = (): Record<string, string> => {
  if (kvStoreCache !== null) {
    return kvStoreCache;
  }

  if (!existsSync(BlixtKvPath)) {
    kvStoreCache = {};
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
  ensureBlixtPaths();
  kvStoreCache = nextStore;
  writeFileSync(BlixtKvPath, JSON.stringify(nextStore), "utf8");
};

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

const normalizeSqlParams = (params: unknown[]): Array<string | number | null> => {
  return params.map((param) => {
    if (param === null || param === undefined) {
      return null;
    }

    if (typeof param === "boolean") {
      return param ? 1 : 0;
    }

    if (typeof param === "bigint") {
      return param.toString();
    }

    if (typeof param === "number" || typeof param === "string") {
      return param;
    }

    return JSON.stringify(param);
  });
};

const isRowReturningSql = (sql: string): boolean => {
  const trimmedSql = sql.trim();
  const firstKeyword = trimmedSql.split(/\s+/, 1)[0]?.toUpperCase() ?? "";
  if (["SELECT", "PRAGMA", "WITH", "EXPLAIN"].includes(firstKeyword)) {
    return true;
  }

  return /\bRETURNING\b/i.test(trimmedSql);
};

const executeSql = (db: BunSqliteDatabase, sql: string, rawParams: unknown[]) => {
  const params = normalizeSqlParams(rawParams);

  if (isRowReturningSql(sql)) {
    const rows = db.query(sql).all(...params);
    return {
      rows,
      rowsAffected: 0,
      insertId: 0,
    };
  }

  const runResult = db.run(sql, params);
  const insertIdValue =
    typeof runResult.lastInsertRowid === "bigint"
      ? Number(runResult.lastInsertRowid)
      : Number(runResult.lastInsertRowid ?? 0);

  return {
    rows: [] as Array<Record<string, unknown>>,
    rowsAffected: Number(runResult.changes ?? 0),
    insertId: Number.isFinite(insertIdValue) ? insertIdValue : 0,
  };
};

const getDatabaseOrThrow = (databaseId: string): BunSqliteDatabase => {
  const db = sqliteDatabaseMap.get(databaseId);
  if (!db) {
    throw new Error(`Unknown sqlite database id: ${databaseId}`);
  }
  return db;
};

export const createBlixtElectrobunHandlers = (): AdditionalElectrobunHandlers<any> => {
  ensureBlixtPaths();

  return {
    requests: {
      __BlixtGetPaths: async () => {
        ensureBlixtPaths();

        return {
          rootPath: normalizeFsPath(BlixtRootPath),
          lndPath: normalizeFsPath(BlixtLndPath),
          lndConfigPath: normalizeFsPath(BlixtLndConfigPath),
          cachePath: normalizeFsPath(BlixtCachePath),
          sqlitePath: normalizeFsPath(BlixtSqlitePath),
          kvPath: normalizeFsPath(BlixtKvPath),
        };
      },

      __BlixtWriteConfig: async ({ config }: { config: string }) => {
        if (typeof config !== "string") {
          throw new Error("Invalid write config payload.");
        }

        ensureBlixtPaths();
        writeFileSync(BlixtLndConfigPath, config, "utf8");

        return {
          path: normalizeFsPath(BlixtLndConfigPath),
        };
      },

      __BlixtGenerateSecureRandomAsBase64: async ({ length }: { length: number }) => {
        const parsedLength = Number(length);
        if (!Number.isFinite(parsedLength) || parsedLength <= 0) {
          throw new Error("Invalid random length.");
        }

        return randomBytes(Math.floor(parsedLength)).toString("base64");
      },

      __BlixtGetFilesDir: async () => {
        ensureBlixtPaths();
        return normalizeFsPath(BlixtRootPath);
      },

      __BlixtGetCacheDir: async () => {
        ensureBlixtPaths();
        return normalizeFsPath(BlixtCachePath);
      },

      __BlixtGetAppFolderPath: async () => {
        ensureBlixtPaths();
        return `${normalizeFsPath(BlixtRootPath)}/`;
      },

      __BlixtOpenDatabase: async (_payload?: { path?: string }) => {
        ensureBlixtPaths();

        const databaseId = `db-${nextDatabaseId++}`;
        const db = new BunSqliteDatabase(BlixtSqlitePath, {
          create: true,
        });

        sqliteDatabaseMap.set(databaseId, db);

        return {
          databaseId,
          path: normalizeFsPath(BlixtSqlitePath),
        };
      },

      __BlixtExecuteSql: async (payload: {
        databaseId: string;
        sql: string;
        params?: unknown[];
      }) => {
        if (!payload || typeof payload.databaseId !== "string" || typeof payload.sql !== "string") {
          throw new Error("Invalid sqlite execute payload.");
        }

        const db = getDatabaseOrThrow(payload.databaseId);
        return executeSql(db, payload.sql, Array.isArray(payload.params) ? payload.params : []);
      },

      __BlixtCloseDatabase: async ({ databaseId }: { databaseId: string }) => {
        if (typeof databaseId !== "string") {
          throw new Error("Invalid sqlite close payload.");
        }

        const db = sqliteDatabaseMap.get(databaseId);
        if (!db) {
          return {
            closed: false,
          };
        }

        db.close();
        sqliteDatabaseMap.delete(databaseId);

        return {
          closed: true,
        };
      },

      __BlixtDeleteDatabase: async () => {
        for (const db of sqliteDatabaseMap.values()) {
          db.close();
        }
        sqliteDatabaseMap.clear();

        if (existsSync(BlixtSqlitePath)) {
          rmSync(BlixtSqlitePath, { force: true });
        }

        return {
          deleted: true,
        };
      },

      __BlixtKvGetItem: async ({ key }: { key: string }) => {
        if (typeof key !== "string") {
          throw new Error("Invalid KV getItem payload.");
        }
        const store = loadKvStore();
        const value = Object.prototype.hasOwnProperty.call(store, key) ? store[key] : null;
        return value;
      },

      __BlixtKvSetItem: async ({ key, value }: { key: string; value: string }) => {
        if (typeof key !== "string" || typeof value !== "string") {
          throw new Error("Invalid KV setItem payload.");
        }

        const nextStore = {
          ...loadKvStore(),
          [key]: value,
        };
        persistKvStore(nextStore);
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
        const nextStore = {
          ...store,
          [key]: mergeJsonStrings(store[key] ?? null, value),
        };
        persistKvStore(nextStore);
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

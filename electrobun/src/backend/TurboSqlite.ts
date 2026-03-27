import { rmSync } from "node:fs";
import { Database as BunSqliteDatabase } from "bun:sqlite";
import type { AdditionalElectrobunHandlers } from "react-native-turbo-lnd/electrobun/bun-rpc-factory";
import { BlixtSqlitePath, normalizeFsPath } from "./BlixtPaths";
import {
  TurboSqliteRpcMethodNames,
  type TurboSqliteTransport,
  type TurboSqliteTransportCloseDatabaseResponse,
  type TurboSqliteTransportDeleteDatabaseResponse,
  type TurboSqliteTransportOpenDatabaseResponse,
} from "../shared/turbo-sqlite-rpc";

const sqliteDatabaseMap = new Map<string, BunSqliteDatabase>();
let nextDatabaseId = 1;

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

type TurboSqliteModuleRequestHandlers = {
  [typeof TurboSqliteRpcMethodNames.openDatabase]: (
    params: Parameters<TurboSqliteTransport["openDatabase"]>,
  ) => Promise<Awaited<ReturnType<TurboSqliteTransport["openDatabase"]>>>;
};

type TurboSqliteDatabaseRequestHandlers = {
  [typeof TurboSqliteRpcMethodNames.executeSql]: (
    params: Parameters<TurboSqliteTransport["executeSql"]>,
  ) => Promise<Awaited<ReturnType<TurboSqliteTransport["executeSql"]>>>;
  [typeof TurboSqliteRpcMethodNames.closeDatabase]: (
    params: Parameters<TurboSqliteTransport["closeDatabase"]>,
  ) => Promise<Awaited<ReturnType<TurboSqliteTransport["closeDatabase"]>>>;
};

const turboSqliteTransport = {
  openDatabase: async (_path: string): Promise<TurboSqliteTransportOpenDatabaseResponse> => {
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
  executeSql: async (databaseId: string, sql: string, params) => {
    const db = getDatabaseOrThrow(databaseId);
    return executeSql(db, sql, Array.isArray(params) ? params : []);
  },

  closeDatabase: async (
    databaseId: string,
  ): Promise<TurboSqliteTransportCloseDatabaseResponse> => {
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
} satisfies TurboSqliteTransport;

const createTurboSqliteModuleRequests = (): TurboSqliteModuleRequestHandlers => {
  return {
    __TurboSqliteOpenDatabase: async (params) => {
      return await turboSqliteTransport.openDatabase(...params);
    },
  };
};

const createTurboSqliteDatabaseRequests = (): TurboSqliteDatabaseRequestHandlers => {
  return {
    __TurboSqliteExecuteSql: async (params) => {
      return await turboSqliteTransport.executeSql(...params);
    },

    __TurboSqliteCloseDatabase: async (params) => {
      return await turboSqliteTransport.closeDatabase(...params);
    },
  };
};

export const createTurboSqliteElectrobunHandlers = (): AdditionalElectrobunHandlers<any> => {
  return {
    requests: {
      ...createTurboSqliteModuleRequests(),
      ...createTurboSqliteDatabaseRequests(),

      __TurboSqliteDeleteDatabase: async (): Promise<TurboSqliteTransportDeleteDatabaseResponse> => {
        for (const db of sqliteDatabaseMap.values()) {
          db.close();
        }
        sqliteDatabaseMap.clear();

        rmSync(BlixtSqlitePath, { force: true });

        return {
          deleted: true,
        };
      },
    },
  };
};

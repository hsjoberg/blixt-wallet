import { rmSync } from "node:fs";
import { Database as BunSqliteDatabase } from "bun:sqlite";
import type { AdditionalElectrobunHandlers } from "react-native-turbo-lnd/electrobun/bun-rpc-factory";
import { BlixtSqlitePath, normalizeFsPath } from "./BlixtPaths";

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

export const createTurboSqliteElectrobunHandlers = (): AdditionalElectrobunHandlers<any> => {
  return {
    requests: {
      __TurboSqliteOpenDatabase: async (_payload?: { path?: string }) => {
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

      __TurboSqliteExecuteSql: async (payload: {
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

      __TurboSqliteCloseDatabase: async ({ databaseId }: { databaseId: string }) => {
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

      __TurboSqliteDeleteDatabase: async () => {
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

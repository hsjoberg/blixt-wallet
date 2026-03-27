import type { Database, Params, SqlResult, Spec } from "react-native-turbo-sqlite";

export type TurboSqliteTransportOpenDatabaseParams = Parameters<Spec["openDatabase"]>;
export type TurboSqliteTransportExecuteSqlParams = [databaseId: string, ...Parameters<Database["executeSql"]>];
export type TurboSqliteTransportCloseDatabaseParams = [databaseId: string];

export type TurboSqliteTransportOpenDatabaseResponse = {
  databaseId: string;
  path: string;
};

export type TurboSqliteTransportCloseDatabaseResponse = {
  closed: boolean;
};

export type TurboSqliteTransportDeleteDatabaseResponse = {
  deleted: boolean;
};

export type TurboSqliteTransport = {
  openDatabase: (
    ...args: TurboSqliteTransportOpenDatabaseParams
  ) => Promise<TurboSqliteTransportOpenDatabaseResponse>;
  executeSql: (
    ...args: TurboSqliteTransportExecuteSqlParams
  ) => Promise<SqlResult>;
  closeDatabase: (
    ...args: TurboSqliteTransportCloseDatabaseParams
  ) => Promise<TurboSqliteTransportCloseDatabaseResponse>;
};

export type TurboSqliteDatabase = Database;
export type TurboSqliteSqlParams = Params;

export const TurboSqliteRpcMethodNames = {
  openDatabase: "__TurboSqliteOpenDatabase",
  executeSql: "__TurboSqliteExecuteSql",
  closeDatabase: "__TurboSqliteCloseDatabase",
  deleteDatabase: "__TurboSqliteDeleteDatabase",
} as const;

export const turboSqliteVersionString = "electrobun-bun-sqlite";

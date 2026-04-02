import TurboSqlite, { Database, Params, SqlResult } from "react-native-turbo-sqlite";
import { getInitialSchema } from "./sqlite-migrations";

const adaptWebDatabase = (db: Database): Database => {
  const webDb = db as Database & {
    executeSqlAsync: (sql: string, params: Params) => Promise<SqlResult>;
    closeAsync: () => Promise<void>;
  };

  return {
    ...webDb,
    executeSql: (sql: string, params: Params) => webDb.executeSqlAsync(sql, params),
    close: () => webDb.closeAsync(),
  } as unknown as Database;
};

export const openDatabase = async (): Promise<Database> => {
  return adaptWebDatabase(await TurboSqlite.openDatabaseAsync("Blixt"));
};

export const setupInitialSchema = async (db: Database) => {
  console.log("Creating initial schema");

  for (const sql of getInitialSchema()) {
    await db.executeSql(sql, []);
  }
};

export const deleteDatabase = async () => {
  console.warn("deleteDatabase() not implemented");
};

export const dropTables = async (db: Database) => {
  await db.executeSql(`DROP TABLE tx`, []);
  await db.executeSql(`DROP TABLE tx_hops`, []);
  await db.executeSql(`DROP TABLE channel_event`, []);
  await db.executeSql(`DROP TABLE contact`, []);
};

export const migrateDatabase = async () => {};

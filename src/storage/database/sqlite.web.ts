import TurboSqlite, { Database, Params } from "react-native-turbo-sqlite";
import { getInitialSchema } from "./sqlite-migrations";
import { IS_ELECTROBUN } from "../../utils/constants";

const adaptWebDatabase = (db: Database): Database => {
  return {
    ...db,
    executeSql: (sql: string, params: Params) => db.executeSqlAsync(sql, params),
    close: () => db.closeAsync(),
  } as unknown as Database;
};

export const openDatabase = async (): Promise<Database> => {
  // Electrobun backend does not use sqlite wasm,
  // as we have our own bun:sqlite shim
  if (IS_ELECTROBUN) {
    return await TurboSqlite.openDatabaseAsync("Blixt");
  }
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

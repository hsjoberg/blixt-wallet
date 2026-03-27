import TurboSqlite, { Database } from "react-native-turbo-sqlite";
import { mockReady } from "react-native-turbo-sqlite/mocks";
import { getInitialSchema } from "./sqlite-migrations";

export const openDatabase = async (): Promise<Database> => {
  await mockReady;
  return await TurboSqlite.openDatabase("Blixt");
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

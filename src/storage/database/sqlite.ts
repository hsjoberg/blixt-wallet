import SQlite, { SQLiteDatabase } from "react-native-sqlite-storage";
import { getInitialSchema } from "./sqlite-migrations";

SQlite.enablePromise(true);

export const openDatabase = async (): Promise<SQLiteDatabase> => {
  const db = await SQlite.openDatabase({
    name: "Blixt",
    location: "default",
  });
  return db;
};

export const setupInitialSchema = async (db: SQLiteDatabase) => {
  console.log("Creating initial schema");

  for (const sql of getInitialSchema()) {
    const r = await db.executeSql(sql);
  }
};

export const deleteDatabase = async () => {
  const r = await SQlite.deleteDatabase({
    name: "Blixt",
    location: "default",
  });
  console.log(r);
};

export const dropTables = async (db: SQLiteDatabase) => {
  await db.executeSql(`DROP TABLE tx`);
  await db.executeSql(`DROP TABLE tx_hops`);
};

export const migrateDatabase = async () => {
};

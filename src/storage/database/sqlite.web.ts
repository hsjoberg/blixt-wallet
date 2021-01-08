import initSqlJs from "sql.js";
import { SqlJs } from "sql.js/module";
import { getInitialSchema } from "./sqlite-migrations";

export const openDatabase = async (): Promise<SqlJs.Database> => {
  const res = await initSqlJs();
  return new res.Database();
};

export const setupInitialSchema = async (db: SqlJs.Database) => {
  console.log("Creating initial schema");

  for (const sql of getInitialSchema()) {
    const r = await db.exec(sql);
  }
};

export const deleteDatabase = async () => {
  console.warn("deleteDatabase() not implemented");
};

export const dropTables = async (db: SqlJs.Database) => {
  await db.exec(`DROP TABLE tx`);
  await db.exec(`DROP TABLE tx_hops`);
  await db.exec(`DROP TABLE channel_event`);
};

export const migrateDatabase = async () => {
};

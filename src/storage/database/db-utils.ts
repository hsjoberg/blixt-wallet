import { SQLiteDatabase } from "react-native-sqlite-storage";

export const query = async (db: SQLiteDatabase, sql: string, params: any[]) => {
  const r = await db.executeSql(sql, params);
  return r;
};

/**
 * @returns number Insert ID
 */
export const queryInsert = async (db: SQLiteDatabase, sql: string, params: any[]): Promise<number> => {
  const r = await query(db, sql, params);
  if (r[0]) {
    return r[0].insertId;
  }
  return -1; // TODO
};

export const queryMulti = async <T>(db: SQLiteDatabase, sql: string, params: any[] = []): Promise<T[]> => {
  const r = await query(db, sql, params);
  const rows = [];
  if (r[0]) {
    for (let i = 0; i < r[0].rows.length; i++) {
      rows.push(r[0].rows.item(i));
    }
  }
  return rows as T[];
};

export const querySingle = async <T>(db: SQLiteDatabase, sql: string, params: any[]): Promise<T | null> => {
  const r = await query(db, sql, params);
  if (r[0]) {
    return r[0].rows.item(0) as T;
  }
  return null;
};

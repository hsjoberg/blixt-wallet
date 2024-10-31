import type { Database, Params } from "react-native-turbo-sqlite";

export const query = async (db: Database, sql: string, params: Params) => {
  const r = await db.executeSql(sql, params);
  return r;
};

/**
 * @returns number Insert ID
 */
export const queryInsert = async (db: Database, sql: string, params: Params): Promise<number> => {
  const r = await query(db, sql, params);
  if (r) {
    return r.insertId;
  }
  return -1; // TODO
};

export const queryMulti = async <T>(
  db: Database,
  sql: string,
  params: any[] = [],
): Promise<T[]> => {
  const r = await query(db, sql, params);
  const rows = [];
  if (r) {
    for (let i = 0; i < r.rows.length; i++) {
      rows.push(r.rows[i]);
    }
  }
  return rows as T[];
};

export const querySingle = async <T>(
  db: Database,
  sql: string,
  params: any[],
): Promise<T | null> => {
  const r = await query(db, sql, params);
  if (r) {
    return r.rows[0] as T;
  }
  return null;
};

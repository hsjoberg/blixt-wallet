import { SqlJs } from "sql.js/module";

export const query = async (db: SqlJs.Database, sql: string, params: any[]) => {
  try {
    return await db.exec(sql, params);
  } catch (e) {
    if (typeof e === "string") {
      throw new Error(e);
    }
    throw e;
  }
};

/**
 * @returns number Insert ID
 */
export const queryInsert = async (
  db: SqlJs.Database,
  sql: string,
  params: any[],
): Promise<number> => {
  try {
    await query(db, sql, params);

    const r = await query(db, "SELECT last_insert_rowid() AS id", []);
    return r[0].values[0][0] as number; // TODO
  } catch (e) {
    if (typeof e === "string") {
      throw new Error(e);
    }
    throw e;
  }
};

export const queryMulti = async <T>(
  db: SqlJs.Database,
  sql: string,
  params: any[] = [],
): Promise<T[]> => {
  try {
    const r = await query(db, sql, params);
    return convertToKeyValue(r[0]) as T[];
  } catch (e) {
    if (typeof e === "string") {
      throw new Error(e);
    }
    throw e;
  }
};

export const querySingle = async <T>(
  db: SqlJs.Database,
  sql: string,
  params: any[],
): Promise<T | null> => {
  try {
    const r = await query(db, sql, params);
    if (r[0]) {
      return convertToKeyValue(r)[0] as T;
    }
    return null;
  } catch (e) {
    if (typeof e === "string") {
      throw new Error(e);
    }
    throw e;
  }
};

// https://github.com/sql-js/sql.js/issues/84#issuecomment-155982147
function convertToKeyValue(query: any) {
  query = query ?? [];
  var queryObjects = [];
  var keys = query.columns;
  var values = query.values;

  for (var i = 0; i < values.length; i++) {
    var valueObject: any = {};
    for (var j = 0; j < keys.length; j++) {
      valueObject[keys[j]] = values[i][j];
    }
    queryObjects.push(valueObject);
  }
  return queryObjects;
}

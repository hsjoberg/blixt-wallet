import { SqlJs } from "sql.js/module";

export const query = async (db: SqlJs.Database, sql: string, params: any[]) => {
  const r = await db.exec(sql, params);
  return r;
};

/**
 * @returns number Insert ID
 */
export const queryInsert = async (db: SqlJs.Database, sql: string, params: any[]): Promise<number> => {
  await query(db, sql, params);

  const r = await query(db, "SELECT last_insert_rowid() AS id", []);
  return r[0].values[0][0] as number; // TODO
};

export const queryMulti = async <T>(db: SqlJs.Database, sql: string, params: any[] = []): Promise<T[]> => {
  const r = await query(db, sql, params);
  return convertToKeyValue(r[0]) as T[];
};

export const querySingle = async <T>(db: SqlJs.Database, sql: string, params: any[]): Promise<T | null> => {
  const r = await query(db, sql, params);
  if (r[0]) {
    return convertToKeyValue(r)[0] as T;
  }
  return null;
};

// https://github.com/sql-js/sql.js/issues/84#issuecomment-155982147
function convertToKeyValue(query: any) {
  query = query ?? [];
  var queryObjects = [];
  var keys = query.columns;
  var values = query.values;

  for(var i = 0; i < values.length; i++) {
      var valueObject: any = {};
      for(var j = 0; j < keys.length; j++){
          valueObject[keys[j]] = values[i][j];
      }
      queryObjects.push(valueObject);
  }
  return queryObjects;
}
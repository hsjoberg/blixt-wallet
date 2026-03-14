import { electrobunRequest } from "../../shared/rpc-client.web";

export type Params = Array<string | number | null | undefined | boolean>;

export interface SqlResult {
  rows: Array<{ [key: string]: any }>;
  rowsAffected: number;
  insertId: number;
}

export interface Database {
  executeSql: (sql: string, params: Params) => Promise<SqlResult>;
  close: () => Promise<void>;
}

type OpenDatabaseResponse = {
  databaseId: string;
};

const TurboSqlite = {
  openDatabase(path: string): Database {
    const openPromise = electrobunRequest<OpenDatabaseResponse>("__BlixtOpenDatabase", { path });

    return {
      async executeSql(sql: string, params: Params): Promise<SqlResult> {
        const { databaseId } = await openPromise;
        return await electrobunRequest<SqlResult>("__BlixtExecuteSql", {
          databaseId,
          sql,
          params,
        });
      },

      async close(): Promise<void> {
        const { databaseId } = await openPromise;
        await electrobunRequest("__BlixtCloseDatabase", {
          databaseId,
        });
      },
    };
  },

  getVersionString(): string {
    return "electrobun-bun-sqlite";
  },
};

export default TurboSqlite;

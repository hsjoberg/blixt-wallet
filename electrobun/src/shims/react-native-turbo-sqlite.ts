import type { Spec } from "react-native-turbo-sqlite";
import { electrobunRequest } from "../shared/rpc-client.web";
import {
  TurboSqliteRpcMethodNames,
  type TurboSqliteDatabase,
  type TurboSqliteSqlParams,
  type TurboSqliteTransportCloseDatabaseResponse,
  type TurboSqliteTransportOpenDatabaseResponse,
  turboSqliteVersionString,
} from "../shared/turbo-sqlite-rpc";

const TurboSqlite: Spec = {
  openDatabase(path: string): TurboSqliteDatabase {
    const openPromise = electrobunRequest<TurboSqliteTransportOpenDatabaseResponse>(
      TurboSqliteRpcMethodNames.openDatabase,
      [path],
    );

    return {
      async executeSql(sql: string, params: TurboSqliteSqlParams) {
        const { databaseId } = await openPromise;
        return await electrobunRequest(TurboSqliteRpcMethodNames.executeSql, [
          databaseId,
          sql,
          params,
        ]);
      },

      async close() {
        const { databaseId } = await openPromise;
        await electrobunRequest<TurboSqliteTransportCloseDatabaseResponse>(
          TurboSqliteRpcMethodNames.closeDatabase,
          [databaseId],
        );
      },
    };
  },

  getVersionString(): string {
    return turboSqliteVersionString;
  },
};

export default TurboSqlite;

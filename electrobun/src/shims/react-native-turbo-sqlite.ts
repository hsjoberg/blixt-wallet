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

const createDatabase = (
  openPromise: Promise<TurboSqliteTransportOpenDatabaseResponse>,
): TurboSqliteDatabase => {
  const executeSql = async (sql: string, params: TurboSqliteSqlParams) => {
    const { databaseId } = await openPromise;
    return await electrobunRequest(TurboSqliteRpcMethodNames.executeSql, [
      databaseId,
      sql,
      params,
    ]);
  };

  const close = async () => {
    const { databaseId } = await openPromise;
    await electrobunRequest<TurboSqliteTransportCloseDatabaseResponse>(
      TurboSqliteRpcMethodNames.closeDatabase,
      [databaseId],
    );
  };

  return {
    executeSql,
    executeSqlAsync: executeSql,
    close,
    closeAsync: close,
  };
};

const TurboSqlite: Spec = {
  openDatabase(path: string): TurboSqliteDatabase {
    const openPromise = electrobunRequest<TurboSqliteTransportOpenDatabaseResponse>(
      TurboSqliteRpcMethodNames.openDatabase,
      [path],
    );

    return createDatabase(openPromise);
  },

  async openDatabaseAsync(path: string): Promise<TurboSqliteDatabase> {
    const openPromise = electrobunRequest<TurboSqliteTransportOpenDatabaseResponse>(
      TurboSqliteRpcMethodNames.openDatabase,
      [path],
    );

    return createDatabase(openPromise);
  },

  getVersionString(): string {
    return turboSqliteVersionString;
  },
};

export default TurboSqlite;

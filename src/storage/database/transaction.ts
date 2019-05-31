import { SQLiteDatabase } from "react-native-sqlite-storage";
import { queryInsert, queryMulti, querySingle } from "./db-utils";

export interface ITransaction {
  id?: number;
  date: number;
  expire: number;
  value: number;
  valuteMsat: number;
  memo: string;
  description: string;
  remotePubkey: string;
  status: "PAID" | "EXPIRED" | "OPEN";
}

export const createTransaction = async (db: SQLiteDatabase, transaction: ITransaction): Promise<number> => {
  return await queryInsert(
    db,
    `INSERT INTO tx
    (date, expire, value, valueMsat, memo, description, remotePubkey, status)
    VALUES
    (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      transaction.date,
      transaction.expire,
      transaction.value,
      transaction.valuteMsat,
      transaction.memo,
      transaction.description,
      transaction.remotePubkey,
      transaction.status,
    ]
  );
};

export const getTransactions = async (db: SQLiteDatabase): Promise<ITransaction[]> => {
  return await queryMulti<ITransaction>(db, `SELECT * FROM tx ORDER BY date;`);
};

export const getTransaction = async (db: SQLiteDatabase, id: number): Promise<ITransaction | null> => {
  return await querySingle<ITransaction>(db, `SELECT * FROM tx WHERE id = ?`, [id]);
};

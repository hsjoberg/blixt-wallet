import { SQLiteDatabase } from "react-native-sqlite-storage";
import { queryInsert, queryMulti, querySingle, query } from "./db-utils";

export interface ITransaction {
  id?: number;
  date: number;
  expire: number;
  value: number;
  valueMsat: number;
  fee?: number;
  feeMsat?: number;
  description: string;
  remotePubkey: string;
  paymentRequest: string;
  status: "SETTLED" | "EXPIRED" | "OPEN";
  rHash: string;
}

export const clearTransactions = async (db: SQLiteDatabase) => {
  await query(
    db,
    `DELETE FROM tx`,
    [],
  );
};

export const createTransaction = async (db: SQLiteDatabase, transaction: ITransaction): Promise<number> => {
  return await queryInsert(
    db,
    `INSERT INTO tx
    (date, expire, value, valueMsat, fee, feeMsat, description, remotePubkey, status, paymentRequest, rHash)
    VALUES
    (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      transaction.date,
      transaction.expire,
      transaction.value,
      transaction.valueMsat,
      transaction.fee || null,
      transaction.feeMsat || null,
      transaction.description,
      transaction.remotePubkey,
      transaction.status,
      transaction.paymentRequest,
      transaction.rHash,
    ],
  );
};

export const updateTransaction = async (db: SQLiteDatabase, transaction: ITransaction): Promise<void> => {
  await query(
    db,
    `UPDATE tx
    SET date = ?,
        expire = ?,
        value = ?,
        valueMsat = ?,
        description = ?,
        remotePubkey = ?,
        status = ?,
        paymentRequest = ?,
        rHash = ?
    WHERE id = ?`,
    [
      transaction.date,
      transaction.expire,
      transaction.value,
      transaction.valueMsat,
      transaction.description,
      transaction.remotePubkey,
      transaction.status,
      transaction.paymentRequest,
      transaction.rHash,
      transaction.id,
    ],
  );
};

export const getTransactions = async (db: SQLiteDatabase): Promise<ITransaction[]> => {
  return await queryMulti<ITransaction>(db, `SELECT * FROM tx ORDER BY date DESC;`);
};

export const getTransaction = async (db: SQLiteDatabase, id: number): Promise<ITransaction | null> => {
  return await querySingle<ITransaction>(db, `SELECT * FROM tx WHERE id = ?`, [id]);
};

import { SQLiteDatabase } from "react-native-sqlite-storage";
import { queryInsert, queryMulti, querySingle, query } from "./db-utils";

export interface ITransaction {
  id?: number;
  date: number;
  expire: number;
  value: number;
  valueMsat: number;
  fee: number | null;
  feeMsat: number | null;
  description: string;
  remotePubkey: string;
  paymentRequest: string;
  status: "ACCEPTED" | "CANCELED" | "OPEN" | "SETTLED" | "UNKNOWN";
  rHash: string;
  nodeAliasCached: string | null;

  hops: ITransactionHop[];
}

export interface ITransactionHop {
  id?: number;
  txId?: number;
  chanId: number | null;
  chanCapacity: number | null;
  amtToForward: number | null;
  amtToForwardMsat: number | null;
  fee: number | null;
  feeMsat: number | null;
  expiry: number | null;
  pubKey: string | null;
}

export const clearTransactions = async (db: SQLiteDatabase) => {
  await query(
    db,
    `DELETE FROM tx`,
    [],
  );
};

export const createTransaction = async (db: SQLiteDatabase, transaction: ITransaction): Promise<number> => {
  const txId = await queryInsert(
    db,
    `INSERT INTO tx
    (date, expire, value, valueMsat, fee, feeMsat, description, remotePubkey, status, paymentRequest, rHash, nodeAliasCached)
    VALUES
    (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      transaction.date,
      transaction.expire,
      transaction.value,
      transaction.valueMsat,
      transaction.fee,
      transaction.feeMsat,
      transaction.description,
      transaction.remotePubkey,
      transaction.status,
      transaction.paymentRequest,
      transaction.rHash,
      transaction.nodeAliasCached,
    ],
  );

  if (transaction.hops) {
    for (const transactionHop of transaction.hops) {
      // TODO figure out what fields are always available
      await queryInsert(
        db,
        `INSERT INTO tx_hops
        (txId, chanId, chanCapacity, amtToForward, amtToForwardMsat, fee, feeMsat, expiry, pubkey)
        VALUES
        (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          txId,
          transactionHop.chanId,
          transactionHop.chanCapacity,
          transactionHop.amtToForward,
          transactionHop.amtToForwardMsat,
          transactionHop.fee,
          transactionHop.feeMsat,
          transactionHop.expiry,
          transactionHop.pubKey,
        ],
      );
    }
  }

  return txId;
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

export const getTransactionHops = async (db: SQLiteDatabase, txId: number): Promise<ITransactionHop[]> => {
  return await queryMulti<ITransactionHop>(db, `SELECT * FROM tx_hops WHERE txId = ?`, [txId]);
};

export const getTransactions = async (db: SQLiteDatabase): Promise<ITransaction[]> => {
  const transactions = await queryMulti<ITransaction>(db, `SELECT * FROM tx ORDER BY date DESC;`);
  return await Promise.all(transactions.map(async (transaction) => ({
    ...transaction,
    // hops: await queryMulti<ITransactionHop>(db, `SELECT * FROM tx_hops WHERE txId = ?`, [transaction.id!]),
  })));
};

export const getTransaction = async (db: SQLiteDatabase, id: number): Promise<ITransaction | null> => {
  return await querySingle<ITransaction>(db, `SELECT * FROM tx WHERE id = ?`, [id]);
};

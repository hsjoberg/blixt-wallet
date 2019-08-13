import { SQLiteDatabase } from "react-native-sqlite-storage";
import { queryInsert, queryMulti, querySingle, query } from "./db-utils";
import Long from "long";

export interface IDBTransaction {
  id: number;
  date: string;
  expire: string;
  value: string;
  valueMsat: string;
  fee: string | null;
  feeMsat: string | null;
  description: string;
  remotePubkey: string;
  status: "ACCEPTED" | "CANCELED" | "OPEN" | "SETTLED" | "UNKNOWN";
  paymentRequest: string;
  rHash: string;
  nodeAliasCached: string | null;
}

export interface ITransaction {
  id?: number;
  date: Long;
  expire: Long;
  value: Long;
  valueMsat: Long;
  fee: Long | null;
  feeMsat: Long | null;
  description: string;
  remotePubkey: string;
  paymentRequest: string;
  status: "ACCEPTED" | "CANCELED" | "OPEN" | "SETTLED" | "UNKNOWN" | "EXPIRED"; // Note: EXPIRED does not exist in lnd
  rHash: string;
  nodeAliasCached: string | null;

  hops: ITransactionHop[];
}

export interface ITransactionHop {
  id?: number;
  txId?: number;
  chanId: Long | null;
  chanCapacity: Long | null;
  amtToForward: Long | null;
  amtToForwardMsat: Long | null;
  fee: Long | null;
  feeMsat: Long | null;
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
      transaction.date.toString(),
      transaction.expire.toString(),
      transaction.value.toString(),
      transaction.valueMsat.toString(),
      (transaction.fee && transaction.fee.toString()) || null,
      (transaction.feeMsat && transaction.feeMsat.toString()) || null,
      transaction.description,
      transaction.remotePubkey,
      transaction.status,
      transaction.paymentRequest,
      transaction.rHash,
      transaction.nodeAliasCached || null,
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
          (transactionHop.chanId && transactionHop.chanId.toString()) || null,
          (transactionHop.chanCapacity && transactionHop.chanCapacity.toString()) || null,
          (transactionHop.amtToForward && transactionHop.amtToForward.toString()) || null,
          (transactionHop.amtToForwardMsat && transactionHop.amtToForwardMsat.toString()) || null,
          (transactionHop.fee && transactionHop.fee.toString()) || null,
          (transactionHop.feeMsat && transactionHop.feeMsat.toString()) || null,
          (transactionHop.expiry && transactionHop.expiry.toString()) || null,
          transactionHop.pubKey,
        ],
      );
    }
  }

  return txId;
};

// TODO fee is not included here
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
      transaction.date.toString(),
      transaction.expire.toString(),
      transaction.value.toString(),
      transaction.valueMsat.toString(),
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
  const transactions = await queryMulti<IDBTransaction>(db, `SELECT * FROM tx ORDER BY date DESC;`);
  return await Promise.all(transactions.map(async (transaction) => ({
    ...convertDBTransaction(transaction),
    // hops: await queryMulti<ITransactionHop>(db, `SELECT * FROM tx_hops WHERE txId = ?`, [transaction.id!]),
  }))) as ITransaction[];
};

export const getTransaction = async (db: SQLiteDatabase, id: number): Promise<ITransaction | null> => {
  const result = await querySingle<IDBTransaction>(db, `SELECT * FROM tx WHERE id = ?`, [id]);
  return (result && convertDBTransaction(result)) || null;
};

const convertDBTransaction = (transaction: IDBTransaction): ITransaction => ({
  id: transaction.id!,
  date: Long.fromString(transaction.date),
  expire: Long.fromString(transaction.expire),
  value: Long.fromString(transaction.value),
  valueMsat: Long.fromString(transaction.valueMsat),
  fee: (transaction.fee && Long.fromString(transaction.fee)) || null,
  feeMsat: (transaction.feeMsat && Long.fromString(transaction.feeMsat)) || null,
  description: transaction.description,
  remotePubkey: transaction.remotePubkey,
  paymentRequest: transaction.paymentRequest,
  status: transaction.status,
  rHash: transaction.rHash,
  nodeAliasCached: transaction.nodeAliasCached,
  hops: [],
});
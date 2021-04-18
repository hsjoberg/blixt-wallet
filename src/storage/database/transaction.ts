import { SQLiteDatabase } from "react-native-sqlite-storage";
import { queryInsert, queryMulti, querySingle, query } from "./db-utils";
import Long from "long";
import { ILNUrlPayResponse } from "../../state/LNURL";
import { ILightningServices}  from "../../utils/lightning-services";
import { hexToUint8Array, bytesToHexString } from "../../utils";

export interface IDBTransaction {
  id: number;
  date: string;
  expire: string;
  value: string;
  valueMsat: string;
  amtPaidSat: string;
  amtPaidMsat: string;
  fee: string | null;
  feeMsat: string | null;
  description: string;
  remotePubkey: string;
  status: "ACCEPTED" | "CANCELED" | "OPEN" | "SETTLED" | "UNKNOWN" | "EXPIRED";
  paymentRequest: string;
  rHash: string;
  nodeAliasCached: string | null;
  payer: string | null;
  valueUSD: number | null;
  valueFiat: number | null;
  valueFiatCurrency: string | null;
  tlvRecordName: string | null;
  locationLong: number | null;
  locationLat: number | null;
  website: string | null;
  type: string;
  preimage: string,
  lnurlPayResponse: string | null;
  identifiedService: string | null;
  note: string | null;
}

export interface ITransaction {
  id?: number;
  date: Long;
  expire: Long;
  value: Long;
  valueMsat: Long;
  amtPaidSat: Long;
  amtPaidMsat: Long;
  fee: Long | null;
  feeMsat: Long | null;
  description: string;
  remotePubkey: string;
  paymentRequest: string;
  status: "ACCEPTED" | "CANCELED" | "OPEN" | "SETTLED" | "UNKNOWN" | "EXPIRED"; // Note: EXPIRED does not exist in lnd
  rHash: string;
  nodeAliasCached: string | null;
  payer?: string | null;
  valueUSD: number | null;
  valueFiat: number | null;
  valueFiatCurrency: string | null;
  tlvRecordName: string | null;
  locationLong: number | null;
  locationLat: number | null;
  website: string | null;
  type: "NORMAL" | "WEBLN" | "LNURL" | "DUNDER_ONDEMANDCHANNEL";
  preimage: Uint8Array,
  lnurlPayResponse: ILNUrlPayResponse | null;
  identifiedService: keyof ILightningServices  | null;
  note?: string | null;

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
    (
      date,
      expire,
      value,
      valueMsat,
      amtPaidSat,
      amtPaidMsat,
      fee,
      feeMsat,
      description,
      remotePubkey,
      status,
      paymentRequest,
      rHash,
      nodeAliasCached,
      payer,
      valueUSD,
      valueFiat,
      valueFiatCurrency,
      tlvRecordName,
      locationLong,
      locationLat,
      website,
      type,
      preimage,
      lnurlPayResponse,
      identifiedService,
      note
    )
    VALUES
    (
      ?,
      ?,
      ?,
      ?,
      ?,
      ?,
      ?,
      ?,
      ?,
      ?,
      ?,
      ?,
      ?,
      ?,
      ?,
      ?,
      ?,
      ?,
      ?,
      ?,
      ?,
      ?,
      ?,
      ?,
      ?,
      ?,
      ?
    )`,
    [
      transaction.date.toString(),
      transaction.expire.toString(),
      transaction.value.toString(),
      transaction.valueMsat.toString(),
      transaction.amtPaidSat.toString(),
      transaction.amtPaidMsat.toString(),
      transaction.fee?.toString() ?? null,
      transaction.feeMsat?.toString() ?? null,
      transaction.description,
      transaction.remotePubkey,
      transaction.status,
      transaction.paymentRequest,
      transaction.rHash,
      transaction.nodeAliasCached ?? null,
      transaction.payer ?? null,
      transaction.valueUSD,
      transaction.valueFiat,
      transaction.valueFiatCurrency,
      transaction.tlvRecordName,
      transaction.locationLong,
      transaction.locationLat,
      transaction.website,
      transaction.type,
      bytesToHexString(transaction.preimage),
      transaction.lnurlPayResponse ? JSON.stringify(transaction.lnurlPayResponse) : null,
      transaction.identifiedService,
      transaction.note ?? null,
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
          transactionHop.chanId?.toString() ?? null,
          transactionHop.chanCapacity?.toString() ?? null,
          transactionHop.amtToForward?.toString() ?? null,
          transactionHop.amtToForwardMsat?.toString() ?? null,
          transactionHop.fee?.toString() ?? null,
          transactionHop.feeMsat?.toString() ?? null,
          transactionHop.expiry?.toString() ?? null,
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
        amtPaidSat = ?,
        amtPaidMsat = ?,
        description = ?,
        remotePubkey = ?,
        status = ?,
        paymentRequest = ?,
        rHash = ?,
        nodeAliasCached = ?,
        payer = ?,
        valueUSD = ?,
        valueFiat = ?,
        valueFiatCurrency = ?,
        tlvRecordName = ?,
        locationLong = ?,
        locationLat = ?,
        website = ?,
        type = ?,
        preimage = ?,
        lnurlPayResponse = ?,
        identifiedService = ?,
        note = ?
    WHERE id = ?`,
    [
      transaction.date.toString(),
      transaction.expire.toString(),
      transaction.value.toString(),
      transaction.valueMsat.toString(),
      transaction.amtPaidSat.toString(),
      transaction.amtPaidMsat.toString(),
      transaction.description,
      transaction.remotePubkey,
      transaction.status,
      transaction.paymentRequest,
      transaction.rHash,
      transaction.nodeAliasCached,
      transaction.payer,
      transaction.valueUSD,
      transaction.valueFiat,
      transaction.valueFiatCurrency,
      transaction.tlvRecordName,
      transaction.locationLong,
      transaction.locationLat,
      transaction.website,
      transaction.type,
      bytesToHexString(transaction.preimage),
      transaction.lnurlPayResponse ? JSON.stringify(transaction.lnurlPayResponse) : null,
      transaction.identifiedService,
      transaction.note ?? null,
      transaction.id,
    ],
  );
};

export const getTransactionHops = async (db: SQLiteDatabase, txId: number): Promise<ITransactionHop[]> => {
  return await queryMulti<ITransactionHop>(db, `SELECT * FROM tx_hops WHERE txId = ?`, [txId]);
};

export const getTransactions = async (db: SQLiteDatabase, getExpired: boolean): Promise<ITransaction[]> => {
  const sql = getExpired
    ? `SELECT * FROM tx ORDER BY date DESC;`
    : `SELECT * FROM tx WHERE status != "EXPIRED" ORDER BY date DESC;`
  ;

  const transactions = await queryMulti<IDBTransaction>(db, sql);
  try {
    return await Promise.all(transactions.map(async (transaction) => ({
      ...convertDBTransaction(transaction),
      // hops: await queryMulti<ITransactionHop>(db, `SELECT * FROM tx_hops WHERE txId = ?`, [transaction.id!]),
    }))) as ITransaction[];
  } catch (e) {
    throw new Error("Error reading transactions from DB: " + e.message);
  }
};

export const getTransaction = async (db: SQLiteDatabase, id: number): Promise<ITransaction | null> => {
  const result = await querySingle<IDBTransaction>(db, `SELECT * FROM tx WHERE id = ?`, [id]);
  return (result && convertDBTransaction(result)) || null;
};

const convertDBTransaction = (transaction: IDBTransaction): ITransaction => {
  let lnurlPayResponse: ILNUrlPayResponse | null = null;
  try {
    lnurlPayResponse = JSON.parse(transaction.lnurlPayResponse ?? "null");
  } catch (e) { }

  return {
    id: transaction.id!,
    date: Long.fromString(transaction.date),
    expire: Long.fromString(transaction.expire),
    value: Long.fromString(transaction.value),
    valueMsat: Long.fromString(transaction.valueMsat),
    amtPaidSat: Long.fromString(transaction.amtPaidSat),
    amtPaidMsat: Long.fromString(transaction.amtPaidMsat),
    fee: transaction.fee ? Long.fromString(transaction.fee) : null,
    feeMsat: transaction.feeMsat ? Long.fromString(transaction.feeMsat) : null,
    description: transaction.description,
    remotePubkey: transaction.remotePubkey,
    paymentRequest: transaction.paymentRequest,
    status: transaction.status,
    rHash: transaction.rHash,
    nodeAliasCached: transaction.nodeAliasCached,
    payer: transaction.payer,
    valueUSD: transaction.valueUSD,
    valueFiat: transaction.valueFiat,
    valueFiatCurrency: transaction.valueFiatCurrency,
    tlvRecordName: transaction.tlvRecordName,
    locationLong: transaction.locationLong,
    locationLat: transaction.locationLat,
    website: transaction.website,
    type: transaction.type as ITransaction["type"] || "NORMAL",
    preimage: transaction.preimage ? hexToUint8Array(transaction.preimage) : new Uint8Array([0]),
    lnurlPayResponse,
    identifiedService: transaction.identifiedService as ITransaction["identifiedService"],
    note: transaction.note,
    hops: [],
  };
};

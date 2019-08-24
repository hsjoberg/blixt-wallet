const schema = [
  `CREATE TABLE tx (
    id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    date TEXT NOT NULL,
    expire TEXT NOT NULL,
    value TEXT NOT NULL,
    valueMsat TEXT NOT NULL,
    amtPaidSat TEXT NOT NULL,
    amtPaidMsat TEXT NOT NULL,
    fee TEXT NULL,
    feeMsat TEXT NULL,
    description TEXT NOT NULL,
    remotePubkey TEXT NOT NULL,
    status TEXT NOT NULL,
    paymentRequest TEXT NOT NULL,
    rHash TEXT NOT NULL,
    nodeAliasCached TEXT NULL,
    payer TEXT NULL,
    valueUSD REAL NULL,
    valueFiat REAL NULL,
    valueFiatCurrency STRING NULL
  )`,

  `CREATE TABLE tx_hops (
    id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    txId INTEGER NOT NULL,
    chanId INTEGER NULL,
    chanCapacity INTEGER NULL,
    amtToForward INTEGER NOT NULL,
    amtToForwardMsat INTEGER NOT NULL,
    fee INTEGER NOT NULL,
    feeMsat INTEGER NOT NULL,
    expiry INTEGER NULL,
    pubkey TEXT NULL
  )`,
  `CREATE INDEX tx_hops_tx_id ON tx_hops(txId)`,

  `CREATE TABLE channel_event (
    id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    txId STRING NOT NULL,
    type STRING NOT NULL
  )`
];

const migrations: string[][] = [];

export const getInitialSchema = () => schema;

export default migrations;

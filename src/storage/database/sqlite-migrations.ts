const schema = [
  `CREATE TABLE tx (
    id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    date INTEGER NOT NULL,
    expire INTEGER NOT NULL,
    value INTEGER NOT NULL,
    valueMsat TEXT NOT NULL,
    fee INTEGER,
    feeMsat INTEGER,
    description	TEXT NOT NULL,
    remotePubkey TEXT NOT NULL,
    status TEXT NOT NULL,
    paymentRequest TEXT NOT NULL,
    rHash	TEXT NOT NULL
  )`,
];

const migrations: string[][] = [];

export const getInitialSchema = () => schema;

export default migrations;

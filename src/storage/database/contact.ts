import { Database } from "react-native-turbo-sqlite";
import { query, queryInsert, queryMulti } from "./db-utils";

type ContactType = "SERVICE" | "PERSON";
type ContactLud16IdentifierMimeType = "text/identifier" | "text/email" | null;

export interface IDBContact {
  id: number;
  domain: string;
  type: string;
  lightningAddress: string | null;
  lud16IdentifierMimeType: string | null;
  lnUrlPay: string | null;
  lnUrlWithdraw: string | null;
  note: string;
  label: string | null;
}

export interface IContact {
  id?: number;
  domain: string;
  type: ContactType;
  lightningAddress: string | null;
  lud16IdentifierMimeType: ContactLud16IdentifierMimeType;
  lnUrlPay: string | null;
  lnUrlWithdraw: string | null;
  note: string;
  label: string | null;
}

export const createContact = async (db: Database, contact: IContact): Promise<number> => {
  const id = await queryInsert(
    db,
    `INSERT INTO contact
    (
      domain,
      type,
      lightningAddress,
      lud16IdentifierMimeType,
      lnUrlPay,
      lnUrlWithdraw,
      note,
      label
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
      ?
    )`,
    [
      contact.domain,
      contact.type,
      contact.lightningAddress,
      contact.lud16IdentifierMimeType,
      contact.lnUrlPay,
      contact.lnUrlWithdraw,
      contact.note,
      contact.label ?? null,
    ],
  );
  return id;
};

export const updateContact = async (db: Database, contact: IContact): Promise<void> => {
  await query(
    db,
    `UPDATE contact
    SET domain = ?,
        type = ?,
        lightningAddress = ?,
        lud16IdentifierMimeType = ?,
        lnUrlPay = ?,
        lnUrlWithdraw = ?,
        note = ?,
        label = ?
    WHERE id = ?`,
    [
      contact.domain,
      contact.type,
      contact.lightningAddress,
      contact.lud16IdentifierMimeType,
      contact.lnUrlPay,
      contact.lnUrlWithdraw,
      contact.note,
      contact.label ?? null,
      contact.id,
    ],
  );
};

export const deleteContact = async (db: Database, id: number) => {
  const c = await query(db, `DELETE FROM contact WHERE id = ?;`, [id]);
  return c;
};

export const getContacts = async (db: Database): Promise<IContact[]> => {
  const c = await queryMulti<IDBContact>(db, `SELECT * FROM contact;`);
  return c.map(convertDBTransaction);
};

const convertDBTransaction = (contact: IDBContact): IContact => {
  return {
    id: contact.id,
    domain: contact.domain,
    type: contact.type as ContactType,
    lightningAddress: contact.lightningAddress,
    lud16IdentifierMimeType: contact.lud16IdentifierMimeType as ContactLud16IdentifierMimeType,
    lnUrlPay: contact.lnUrlPay,
    lnUrlWithdraw: contact.lnUrlWithdraw,
    note: contact.note,
    label: contact.label,
  };
};

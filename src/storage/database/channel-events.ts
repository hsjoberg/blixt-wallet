import { SQLiteDatabase } from "react-native-sqlite-storage";
import { queryInsert, queryMulti } from "./db-utils";

export interface IDBChannelEvent {
  id: number;
  txId: string;
  type: "OPEN" | "CLOSE";
}

export interface IChannelEvent {
  id?: number;
  txId: string;
  type: "OPEN" | "CLOSE";
}

export const createChannelEvent = async (
  db: SQLiteDatabase,
  channelEvent: IChannelEvent,
): Promise<number> => {
  const id = await queryInsert(
    db,
    `INSERT INTO channel_event
    (txId, type)
    VALUES
    (?, ?)`,
    [channelEvent.txId, channelEvent.type],
  );
  return id;
};

export const getChannelEvents = async (db: SQLiteDatabase): Promise<IChannelEvent[]> => {
  const c = await queryMulti<IDBChannelEvent>(db, `SELECT * FROM channel_event;`);
  return c;
};

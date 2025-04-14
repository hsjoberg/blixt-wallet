import { Database } from "react-native-turbo-sqlite";
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
  db: Database,
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

export const getChannelEvents = async (db: Database): Promise<IChannelEvent[]> => {
  const c = await queryMulti<IDBChannelEvent>(db, `SELECT * FROM channel_event;`);
  return c;
};

import { format } from "date-fns";
import * as querystring from "querystring";
import Long from "long";

export const capitalize = (word: string) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();

export const formatISO = (date: Date) => format(date, "yyyy-MM-dd HH:mm");

/**
 * Used for parsing bech32 Bitcoin addresses + URI
 * TODO change function name
 */
export interface IParsedBech32 {
  address: string;
  amount?: number;
}
export const parseBech32 = (address: string): IParsedBech32 => {
  address = address.replace("bitcoin:", "");
  const returns: IParsedBech32 = { address: "" };

  if (address.includes("?")) {
    const split = address.split("?");
    address = split[0];

    const q = querystring.parse(split[1]);
    if (q.amount) {
      returns.amount = Number.parseFloat((q.amount as string));
    }
  }

  returns.address = address;
  return returns;
};

export const timeout = (time: number) => new Promise((resolve) => setTimeout(() => resolve(), time));

export const isLong = (subject: any): subject is Long => Long.isLong(subject);

export const formatNumberGroupings = (subject: number | string) => subject.toString().replace(/(\d)(?=(\d{3})+(?!\d))/g, '$1 ');

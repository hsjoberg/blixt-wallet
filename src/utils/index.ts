import { Toast } from "native-base";
import { format } from "date-fns";
import * as querystring from "querystring";
import Long from "long";
import Geolocation, { GeolocationResponse, GeolocationError } from "@react-native-community/geolocation";

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

export const stringToUint8Array = (str: string) => {
  return Uint8Array.from(str, x => x.charCodeAt(0))
};

export const bytesToString = (bytes: ArrayLike<number>) => {
  return String.fromCharCode.apply(null, bytes);
}

export const uint8ArrayToString = (bytes: Uint8Array) => bytesToString(bytes);

export const bytesToHexString = (bytes: ArrayLike<number>) => {
  return bytes.reduce(function(memo, i) {
    return memo + ('0' + i.toString(16)).slice(-2); //padd with leading 0 if <16
  }, "");
}

export const hexToUint8Array = (hexString: string) => {
  return new Uint8Array(hexString.match(/.{1,2}/g)!.map(byte => parseInt(byte, 16)));
};

export const toast = (message: string, period = 3000, type: "danger" | "success" | "warning" = "success", button?: string) => {
  console.log(message);
  Toast.show({
    duration: period,
    type,
    text: message,
    buttonText: button,
  });
}

export const getGeolocation = (): Promise<GeolocationResponse["coords"]>  => {
  return new Promise((resolve, reject) => {
    Geolocation.getCurrentPosition((position) => {
      resolve(position.coords);
    }, (error) => {
      reject(error as GeolocationError);
    });
  });
}

export const camelCaseToSpace = (text: string) =>
  text
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, function(str){ return str.toUpperCase(); });


// Copied from BufferJS
export const asciiToBytes = (str: string) => {
  const byteArray = [];
  for (let i = 0; i < str.length; ++i) {
    // Node's code seems to be doing this and not & 0x7F..
    byteArray.push(str.charCodeAt(i) & 0xFF);
  }
  return byteArray;
};

export const decodeTLVRecord = (utf8: string) => {
  const bytes = asciiToBytes(utf8);
  return Long.fromBytesLE(bytes).toNumber();
}
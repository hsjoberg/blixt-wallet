import { AppState } from "react-native";
import { Toast } from "native-base";
import { format } from "date-fns";
import * as querystring from "querystring";
import Long from "long";
import aesjs, { ByteSource } from "aes-js";
import * as base64 from "base64-js";
import { Alert } from "react-native";
import type { GeolocationResponse, GeolocationError } from "@react-native-community/geolocation";
import { PLATFORM } from "./constants";

let Geolocation: any;
if (PLATFORM !== "macos") {
  Geolocation = require("@react-native-community/geolocation");
}

export const capitalize = (word: string) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();

export const formatISO = (date: Date, omitTime: boolean = false) =>
  format(date, "yyyy-MM-dd" + (omitTime ? "" : " HH:mm"));

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
  address = address.replace("BITCOIN:", "");
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
};

export const uint8ArrayToString = (bytes: Uint8Array) => bytesToString(bytes);

export const bytesToHexString = (bytes) => {
  // console.log("inside bytesToHexString");
  // console.log(bytes);
  return bytes.reduce(function (memo, i) {
    return memo + ('0' + i.toString(16)).slice(-2); //padd with leading 0 if <16
  }, "");
};

export const hexToUint8Array = (hexString: string) => {
  return new Uint8Array(hexString.match(/.{1,2}/g)!.map(byte => parseInt(byte, 16)));
};

export const toast = (message: string, period = 8000, type: "danger" | "success" | "warning" = "success", button?: string) => {
  try {
    console.log(message);
    if (AppState.currentState === "active") {
      Toast.show({
        duration: period,
        type,
        text: message,
        buttonText: button,
      });
    } else {
      console.log(`Got message in while in ${AppState.currentState} app state`)
    }
  } catch (error) {
    Alert.alert("", error.message);
  }
}

export const getGeolocation = (): Promise<GeolocationResponse["coords"]> => {
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
    .replace(/^./, function(str) { return str.toUpperCase(); });


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

export const getDomainFromURL = (url: string) => url.replace('http://', '').replace('https://', '').split(/[/?#]/)[0];

export const decryptAesToUtf8 = (key: ByteSource, iv: ByteSource, ciphertext: ByteSource) => {
  const aesCbc = new aesjs.ModeOfOperation.cbc(
    key,
    iv
  );

  const msg = aesCbc.decrypt(ciphertext);
  return uint8ArrayToString(msg);
}

export const decryptLNURLPayAesTagMessage = (preimage: Uint8Array, iv: string, ciphertext: string) => {
  return decryptAesToUtf8(
    preimage,
    base64.toByteArray(iv),
    base64.toByteArray(ciphertext)
  );
};

export const waitUntilTrue = async (cb: () => boolean) => {
  while (!cb()) {
    await timeout(1000);
  }
}

export const countCharInString = (str: string, char: string) => {
  let occurances = 0;
  for (const subject of str) {
    if (subject === char) {
      occurances++;
    }
  }
  return occurances;
}

// from https://coolaj86.com/articles/unicode-string-to-a-utf-8-typed-array-buffer-in-javascript/
export function unicodeStringToUint8Array(s: string) {
  var escstr = encodeURIComponent(s);
  var binstr = escstr.replace(/%([0-9A-F]{2})/g, function(match, p1) {
      return String.fromCharCode('0x' + p1 as any);
  });
  var ua = new Uint8Array(binstr.length);
  Array.prototype.forEach.call(binstr, function (ch, i) {
      ua[i] = ch.charCodeAt(0);
  });
  return ua;
}

export function uint8ArrayToUnicodeString(ua: Uint8Array) {
  var binstr = Array.prototype.map.call(ua, function (ch) {
      return String.fromCharCode(ch);
  }).join('');
  var escstr = binstr.replace(/(.)/g, function (m, p) {
      var code = p.charCodeAt(p).toString(16).toUpperCase();
      if (code.length < 2) {
          code = '0' + code;
      }
      return '%' + code;
  });
  return decodeURIComponent(escstr);
}

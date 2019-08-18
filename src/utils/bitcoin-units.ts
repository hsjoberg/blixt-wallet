import Big from "big.js";
import BigNumber from "bignumber.js";
import Long from "long";

// export enum BitcoinUnit {
//   bitcoin = "btc",
//   milliBitcoin = "mbtc",
//   bit = "bit",
//   satoshi = "satoshi",
// }

export interface IBitcoinUnit {
  nice: string;
  settings: string;
  unit: number;
  pluralize?: boolean;
}

export interface IBitcoinUnits {
  bitcoin: IBitcoinUnit;
  milliBitcoin: IBitcoinUnit;
  bit: IBitcoinUnit;
  satoshi: IBitcoinUnit;
}

export const BitcoinUnits: IBitcoinUnits = {
  bitcoin: {
    nice: "₿",
    settings: "Bitcoin",
    unit: 1,
  },
  milliBitcoin: {
    nice: "mBTC",
    settings: "Milli Bitcoin",
    unit: 1 / 1E3,
  },
  bit: {
    nice: "bits",
    settings: "Bits",
    pluralize: true,
    unit: 1 / 1E6,
  },
  satoshi: {
    nice: "satoshi",
    settings: "Satoshi",
    unit: 1 / 1E8,
  },
  // TODO Milli Satoshi
}

const to = (value: number, from: keyof IBitcoinUnits, to: keyof IBitcoinUnits): BigNumber => {
  const btc = new BigNumber(value).times(BitcoinUnits[from].unit);
  return btc.div(BitcoinUnits[to].unit);
};

export const formatBitcoin = (satoshi: Long, unit: keyof IBitcoinUnits): string => {
  const value = to(satoshi.toNumber(), "satoshi", unit);
  let formatted = `${value.toFixed()} ${BitcoinUnits[unit].nice}`;
  if (BitcoinUnits[unit].pluralize && value.eq(new BigNumber(1))) {
    formatted += "s";
  }
  return formatted;
};

export const valueBitcoin = (satoshi: Long, unit: keyof IBitcoinUnits): string => {
  return to(satoshi.toNumber(), "satoshi", unit).toFixed();
};

export const unitToSatoshi = (value: number, fromUnit: keyof IBitcoinUnits): number => {
  return to(value, fromUnit, "satoshi").toNumber();
};

export const convertBitcoinToFiat = (satoshi: Long, conversion: number, fiatUnit?: string): string => {
  if (fiatUnit) {
    fiatUnit = " " + fiatUnit;
  }
  const fiat = valueFiat(satoshi, conversion).toFixed(2);
  return `${fiat}${fiatUnit}`;
};

export const valueFiat = (satoshi: Long, conversion: number): number => {
  return to(satoshi.toNumber(), "satoshi", "bitcoin")
          .multipliedBy(conversion)
          .toNumber();
};

export const valueBitcoinFromFiat = (fiat: number, conversion: number, unit: keyof IBitcoinUnits): number => {
  const btc = fiat / conversion;
  return to(btc, "bitcoin", unit).toNumber();
};

function isLong(subject: any): subject is Long {
  return Long.isLong(subject);
}
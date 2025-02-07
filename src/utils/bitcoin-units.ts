import BigNumber from "bignumber.js";
import { formatNumberGroupings } from "./index";

export interface IBitcoinUnit {
  key: keyof IBitcoinUnits;
  nice: string;
  settings: string;
  unit: number;
  pluralize?: boolean;
  decimals: number;
}

export interface IBitcoinUnits {
  bitcoin: IBitcoinUnit;
  milliBitcoin: IBitcoinUnit;
  bit: IBitcoinUnit;
  sat: IBitcoinUnit;
  satoshi: IBitcoinUnit;
}

export const BitcoinUnits: IBitcoinUnits = {
  bitcoin: {
    key: "bitcoin",
    nice: "₿",
    settings: "Bitcoin",
    unit: 1,
    decimals: 8,
  },
  milliBitcoin: {
    key: "milliBitcoin",
    nice: "mBTC",
    settings: "Milli Bitcoin",
    unit: 1 / 1e3,
    decimals: 5,
  },
  bit: {
    key: "bit",
    nice: "bit",
    settings: "Bits",
    pluralize: true,
    unit: 1 / 1e6,
    decimals: 2,
  },
  sat: {
    key: "sat",
    nice: "sat",
    settings: "Sats",
    pluralize: true,
    unit: 1 / 1e8,
    decimals: 0,
  },
  satoshi: {
    key: "satoshi",
    nice: "satoshi",
    settings: "Satoshi",
    unit: 1 / 1e8,
    decimals: 0,
  },
};

export const convertBitcoinUnit = (
  value: number,
  from: keyof IBitcoinUnits,
  to: keyof IBitcoinUnits,
): BigNumber => {
  const btc = new BigNumber(value).times(BitcoinUnits[from].unit);
  return btc.div(BitcoinUnits[to].unit);
};

export const formatBitcoin = (satoshi: BigInt, unit: keyof IBitcoinUnits): string => {
  if (typeof satoshi !== "bigint") {
    throw new Error("Argument need to be type bigint. Arg: " + typeof satoshi);
  }

  const value = convertBitcoinUnit(Number(satoshi), "satoshi", unit);
  const fixed = value.toFixed(BitcoinUnits[unit].decimals);

  switch (unit) {
    case "bitcoin":
      return `${
        fixed.substring(0, fixed.indexOf(".") + 1) +
        fixed.substring(fixed.indexOf(".") + 1).replace(/(\d{2})(\d{3})(\d{3})/, "$1 $2 $3")
      } ${getUnitNice(value, unit)}`;
    case "milliBitcoin":
    case "bit":
      return `${fixed} ${getUnitNice(value, unit)}`;
    case "sat":
    case "satoshi": {
      return `${formatNumberGroupings(fixed)} ${getUnitNice(value, unit)}`;
    }
  }
};

export const getUnitNice = (value: BigNumber, unit: keyof IBitcoinUnits) => {
  let str = BitcoinUnits[unit].nice;
  if (BitcoinUnits[unit].pluralize && !value.isEqualTo(new BigNumber(1))) {
    str += "s";
  }
  return str;
};

export const valueBitcoin = (
  satoshi: bigint,
  unit: keyof IBitcoinUnits,
  groupNumbers: boolean = false,
): string => {
  if (typeof satoshi !== "bigint") {
    throw new Error("Argument need to be type bigint. Arg: " + typeof satoshi);
  }

  return groupNumbers
    ? formatNumberGroupings(convertBitcoinUnit(Number(satoshi), "satoshi", unit).toFixed())
    : convertBitcoinUnit(Number(satoshi), "satoshi", unit).toFixed();
};

export const unitToSatoshi = (value: number, fromUnit: keyof IBitcoinUnits): number => {
  return convertBitcoinUnit(value, fromUnit, "satoshi").toNumber();
};

export const convertBitcoinToFiat = (
  satoshi: number | bigint,
  conversion: number,
  fiatUnit?: string,
): string => {
  if (typeof satoshi !== "bigint" && typeof satoshi !== "number") {
    throw new Error("Argument need to be type bigint or number. Arg: " + typeof satoshi);
  }

  if (typeof satoshi === "number") {
    satoshi = BigInt(satoshi);
  }

  if (fiatUnit) {
    fiatUnit = " " + fiatUnit;
  }
  const fiat = valueFiat(satoshi, conversion).toFixed(2);
  return `${fiat}${fiatUnit ?? ""}`;
};

export const valueFiat = (satoshi: BigInt, conversion: number): number => {
  if (typeof satoshi !== "bigint") {
    throw new Error("Argument need to be type bigint. Arg: " + typeof satoshi);
  }

  return convertBitcoinUnit(Number(satoshi), "satoshi", "bitcoin")
    .multipliedBy(conversion)
    .toNumber();
};

export const valueBitcoinFromFiat = (
  fiat: number,
  conversion: number,
  unit: keyof IBitcoinUnits,
): string => {
  const btc = fiat / conversion;
  return convertBitcoinUnit(btc, "bitcoin", unit).toFixed(BitcoinUnits[unit].decimals);
};

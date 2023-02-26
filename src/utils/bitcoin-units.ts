import BigNumber from "bignumber.js";
import Long from "long";
import { isLong, formatNumberGroupings } from "./index";

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

export const formatBitcoin = (
  satoshi: Long,
  unit: keyof IBitcoinUnits,
  groupNumbers: boolean = false,
): string => {
  const value = convertBitcoinUnit(satoshi.toNumber(), "satoshi", unit);
  const fixed = value.toFixed(BitcoinUnits[unit].decimals);

  const formatNumber = groupNumbers ? formatNumberGroupings(fixed) : fixed;

  return `${
    unit === "bitcoin"
      ? formatNumber.substring(0, formatNumber.indexOf(".") + 1) +
        formatNumber
          .substring(formatNumber.indexOf(".") + 1)
          .replace(/(\d{2})(\d{3})(\d{3})/, "$1 $2 $3")
      : formatNumber
  } ${getUnitNice(value, unit)}`;
};

export const getUnitNice = (value: BigNumber, unit: keyof IBitcoinUnits) => {
  let str = BitcoinUnits[unit].nice;
  if (BitcoinUnits[unit].pluralize && !value.isEqualTo(new BigNumber(1))) {
    str += "s";
  }
  return str;
};

export const valueBitcoin = (
  satoshi: Long.Long,
  unit: keyof IBitcoinUnits,
  groupNumbers: boolean = false,
): string => {
  return groupNumbers
    ? formatNumberGroupings(convertBitcoinUnit(satoshi.toNumber(), "satoshi", unit).toFixed())
    : convertBitcoinUnit(satoshi.toNumber(), "satoshi", unit).toFixed();
};

export const unitToSatoshi = (value: number, fromUnit: keyof IBitcoinUnits): number => {
  return convertBitcoinUnit(value, fromUnit, "satoshi").toNumber();
};

export const convertBitcoinToFiat = (
  satoshi: Long | number,
  conversion: number,
  fiatUnit?: string,
): string => {
  if (!isLong(satoshi)) {
    satoshi = Long.fromNumber(satoshi);
  }

  if (fiatUnit) {
    fiatUnit = " " + fiatUnit;
  }
  const fiat = valueFiat(satoshi, conversion).toFixed(2);
  return `${fiat}${fiatUnit ?? ""}`;
};

export const valueFiat = (satoshi: Long.Long, conversion: number): number => {
  return convertBitcoinUnit(satoshi.toNumber(), "satoshi", "bitcoin")
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

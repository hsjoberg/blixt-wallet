import { Action, action, Thunk, thunk } from "easy-peasy";

import { StorageItem, getItemObject, setItemObject, removeItem, getItem, setItem } from "../storage/app";
import { IFiatRates } from "./Fiat";

export enum BitcoinUnit {
  bitcoin = "btc",
  milliBitcoin = "mbtc",
  bit = "bit",
  satoshi = "satoshi",
}

export const BitcoinUnitAlias = {
  [BitcoinUnit.bitcoin]: {
    nice: "₿",
    settings: "Bitcoin",
  },
  [BitcoinUnit.milliBitcoin]: {
    nice: "mBTC",
    settings: "Milli Bitcoin",
  },
  [BitcoinUnit.bit]: {
    nice: "bits",
    settings: "Bits",
  },
  [BitcoinUnit.satoshi]: {
    nice: "satoshi",
    settings: "Satoshi",
  },
}

export interface ISettingsModel {
  initialize: Thunk<ISettingsModel>;

  changeBitcoinUnit: Thunk<ISettingsModel, BitcoinUnit>;
  changeFiatUnit: Thunk<ISettingsModel, keyof IFiatRates>;

  setBitcoinUnit: Action<ISettingsModel, BitcoinUnit>;
  setFiatUnit: Action<ISettingsModel, keyof IFiatRates>;

  bitcoinUnit: BitcoinUnit;
  fiatUnit: keyof IFiatRates;
}

export const settings: ISettingsModel = {
  initialize: thunk(async (actions) => {
    actions.setBitcoinUnit(await getItemObject(StorageItem.bitcoinUnit) || BitcoinUnit.bitcoin);
    actions.setFiatUnit(await getItemObject(StorageItem.fiatUnit) || "USD");
  }),

  changeBitcoinUnit: thunk(async (actions, payload) => {
    await setItemObject(StorageItem.bitcoinUnit, payload);
    actions.setBitcoinUnit(payload);
  }),

  changeFiatUnit: thunk(async (actions, payload) => {
    await setItemObject(StorageItem.fiatUnit, payload);
    actions.setFiatUnit(payload);
  }),

  setBitcoinUnit: action((state, payload) => { state.bitcoinUnit = payload; }),
  setFiatUnit: action((state, payload) => { state.fiatUnit = payload; }),

  bitcoinUnit: BitcoinUnit.bitcoin,
  fiatUnit: "USD",
};


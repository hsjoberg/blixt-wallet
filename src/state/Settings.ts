import { Action, action, Thunk, thunk } from "easy-peasy";

import { StorageItem, getItemObject, setItemObject, removeItem, getItem, setItem } from "../storage/app";

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

  setBitcoinUnit: Action<ISettingsModel, BitcoinUnit>;

  bitcoinUnit: BitcoinUnit;
}

export const settings: ISettingsModel = {
  initialize: thunk(async (actions) => {
    actions.setBitcoinUnit(await getItemObject(StorageItem.bitcoinUnit) || BitcoinUnit.bitcoin);
  }),

  changeBitcoinUnit: thunk(async (actions, payload) => {
    await setItemObject(StorageItem.bitcoinUnit, payload);
    actions.setBitcoinUnit(payload);
  }),

  setBitcoinUnit: action((state, payload) => { state.bitcoinUnit = payload; }),

  bitcoinUnit: BitcoinUnit.bitcoin,
};


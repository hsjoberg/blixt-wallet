import { Action, action, Thunk, thunk } from "easy-peasy";

import { StorageItem, getItemObject, setItemObject, removeItem, getItem, setItem } from "../storage/app";
import { IFiatRates } from "./Fiat";
import { IBitcoinUnit, IBitcoinUnits, BitcoinUnits } from "../utils/bitcoin-units";

export interface ISettingsModel {
  initialize: Thunk<ISettingsModel>;

  changeBitcoinUnit: Thunk<ISettingsModel, keyof IBitcoinUnits>;
  changeFiatUnit: Thunk<ISettingsModel, keyof IFiatRates>;

  setBitcoinUnit: Action<ISettingsModel, keyof IBitcoinUnits>;
  setFiatUnit: Action<ISettingsModel, keyof IFiatRates>;

  bitcoinUnit: keyof IBitcoinUnits;
  fiatUnit: keyof IFiatRates;
}

export const settings: ISettingsModel = {
  initialize: thunk(async (actions) => {
    actions.setBitcoinUnit(await getItemObject(StorageItem.bitcoinUnit) || "bitcoin");
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

  bitcoinUnit: "bitcoin",
  fiatUnit: "USD",
};

import { Action, action, Thunk, thunk } from "easy-peasy";

import { StorageItem, getItemObject, setItemObject, removeItem, getItem, setItem } from "../storage/app";
import { IFiatRates } from "./Fiat";
import { IBitcoinUnit, IBitcoinUnits, BitcoinUnits } from "../utils/bitcoin-units";

export interface ISettingsModel {
  initialize: Thunk<ISettingsModel>;

  changeBitcoinUnit: Thunk<ISettingsModel, keyof IBitcoinUnits>;
  changeFiatUnit: Thunk<ISettingsModel, keyof IFiatRates>;
  changeName: Thunk<ISettingsModel, string | null>;

  setBitcoinUnit: Action<ISettingsModel, keyof IBitcoinUnits>;
  setFiatUnit: Action<ISettingsModel, keyof IFiatRates>;
  setName: Action<ISettingsModel, string | null>;

  bitcoinUnit: keyof IBitcoinUnits;
  fiatUnit: keyof IFiatRates;
  name: string | null;
}

export const settings: ISettingsModel = {
  initialize: thunk(async (actions) => {
    actions.setBitcoinUnit(await getItemObject(StorageItem.bitcoinUnit) || "bitcoin");
    actions.setFiatUnit(await getItemObject(StorageItem.fiatUnit) || "USD");
    actions.setName(await getItemObject(StorageItem.name) || null);
  }),

  changeBitcoinUnit: thunk(async (actions, payload) => {
    await setItemObject(StorageItem.bitcoinUnit, payload);
    actions.setBitcoinUnit(payload);
  }),

  changeFiatUnit: thunk(async (actions, payload) => {
    await setItemObject(StorageItem.fiatUnit, payload);
    actions.setFiatUnit(payload);
  }),

  changeName: thunk(async (actions, payload) => {
    if (payload && payload.length === 0) {
      payload = null;
    }
    await setItemObject(StorageItem.name, payload);
    actions.setName(payload);
  }),

  setBitcoinUnit: action((state, payload) => { state.bitcoinUnit = payload; }),
  setFiatUnit: action((state, payload) => { state.fiatUnit = payload; }),
  setName: action((state, payload) => { state.name = payload; }),

  bitcoinUnit: "bitcoin",
  fiatUnit: "USD",
  name: null,
};

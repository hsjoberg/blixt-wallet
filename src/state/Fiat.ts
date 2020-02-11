import { Action, action, Thunk, thunk, computed, Computed } from "easy-peasy";
import { IStoreModel } from "../state";

import logger from "./../utils/log";
const log = logger("Fiat");

const BLOCKCHAIN_FIAT_API_URL = "https://blockchain.info/ticker";
const BTCSAT = 100000000;

export interface IFiatRate {
  last: number;
}

export interface IFiatRates {
  USD: IFiatRate;
  JPY: IFiatRate;
  CNY: IFiatRate;
  SGD: IFiatRate;
  HKD: IFiatRate;
  CAD: IFiatRate;
  NZD: IFiatRate;
  AUD: IFiatRate;
  CLP: IFiatRate;
  GBP: IFiatRate;
  DKK: IFiatRate;
  SEK: IFiatRate;
  ISK: IFiatRate;
  CHF: IFiatRate;
  BRL: IFiatRate;
  EUR: IFiatRate;
  RUB: IFiatRate;
  PLN: IFiatRate;
  THB: IFiatRate;
  KRW: IFiatRate;
  TWD: IFiatRate;
}

export interface IFiatModel {
  getRate: Thunk<IFiatModel>;

  setFiatRates: Action<IFiatModel, IFiatRates>;

  fiatRates: IFiatRates;
  currentRate: Computed<IFiatModel, number, IStoreModel>;
};

export const fiat: IFiatModel = {
  getRate: thunk(async (actions) => {
    try {
      log.d("Fetching fiat rate");
      const result = await fetch(BLOCKCHAIN_FIAT_API_URL);
      const jsonResult = await result.json();
      if (validateFiatApiResponse(jsonResult)) {
        actions.setFiatRates(jsonResult);
      }
    } catch (e) {
      log.e("Failed to fetch fiat rate API:" + e.message);
    }
  }),

  setFiatRates: action((state, payload) => {
    state.fiatRates = payload;
  }),

  fiatRates: {
    USD: { last: 0 },
    JPY: { last: 0 },
    CNY: { last: 0 },
    SGD: { last: 0 },
    HKD: { last: 0 },
    CAD: { last: 0 },
    NZD: { last: 0 },
    AUD: { last: 0 },
    CLP: { last: 0 },
    GBP: { last: 0 },
    DKK: { last: 0 },
    SEK: { last: 0 },
    ISK: { last: 0 },
    CHF: { last: 0 },
    BRL: { last: 0 },
    EUR: { last: 0 },
    RUB: { last: 0 },
    PLN: { last: 0 },
    THB: { last: 0 },
    KRW: { last: 0 },
    TWD: { last: 0 },
  },

  currentRate: computed([
      (state) => state.fiatRates,
      (_, storeState) => storeState.settings.fiatUnit,
    ], (fiatRates, fiatUnit) => {
    if (fiatRates[fiatUnit] && fiatRates[fiatUnit].last) {
      return fiatRates[fiatUnit].last;
    }
    return 0;
  }),
};

const validateFiatApiResponse = (response: any): response is IFiatRates => {
  return response;
};

import { Action, action, Thunk, thunk, computed, Computed } from "easy-peasy";
import { IStoreModel } from "../state";

const BLOCKCHAIN_FIAT_API_URL = "https://blockchain.info/ticker";
const BTCSAT = 100000000;

export interface IFiatRate {
  last: number;
}

export interface IFiatRates {
  USD: IFiatRate;
  SEK: IFiatRate
}

export interface IFiatModel {
  getRate: Thunk<IFiatModel>;

  setFiatRates: Action<IFiatModel, IFiatRates>;
  convertSatToFiat: Thunk<IFiatModel, number, any, IStoreModel, number>;
  convertSatToFiatFormatted: Thunk<IFiatModel, number, any, IStoreModel, string>;
  convertFiatToSat: Thunk<IFiatModel, number>;

  fiatRates: IFiatRates;
  currentRate: Computed<IFiatModel, number, IStoreModel>;
};

export const fiat: IFiatModel = {
  getRate: thunk(async (actions) => {
    try {
      console.log("Fetching fiat rate");
      const result = await fetch(BLOCKCHAIN_FIAT_API_URL);
      const jsonResult = await result.json();
      const fiatRates = validateFiatApiResponse(jsonResult);
      actions.setFiatRates(fiatRates);
    } catch (e) {
      console.log("Failed to fetch fiat rate API", e.message);
    }
  }),

  setFiatRates: action((state, payload) => {
    state.fiatRates = payload;
  }),

  convertSatToFiat: thunk((_, sat, { getState, getStoreState }) => {
    const fiatRates = getState().fiatRates;
    const currentFiatUnit = getStoreState().settings.fiatUnit;
    if (!fiatRates[currentFiatUnit] || !fiatRates[currentFiatUnit].last) {
      return "0";
    }
    const fiat = fiatRates[currentFiatUnit];
    return Number.parseFloat(((sat / BTCSAT) * fiat.last).toString()).toFixed(2);
  }),

  convertSatToFiatFormatted: thunk((_, sat, { getState, getStoreState }) => {
    const fiatRates = getState().fiatRates;
    const currentFiatUnit = getStoreState().settings.fiatUnit;
    if (!fiatRates[currentFiatUnit] || !fiatRates[currentFiatUnit].last) {
      return "0";
    }
    const fiat = fiatRates[currentFiatUnit];
    return `${Number.parseFloat(((sat / BTCSAT) * fiat.last).toString()).toFixed(2)} ${currentFiatUnit}`;
  }),

  convertFiatToSat: thunk((_, sat, { getState }) => {
    const { USD } = getState().fiatRates;
    if (!USD || !USD.last) {
      return 0;
    }
    return Number.parseFloat(((sat * BTCSAT) / USD.last).toString()).toFixed(2);
  }),

  fiatRates: {
    USD: {
      last: 0,
    },
    EUR: {
      last: 0,
    },
    SEK: {
      last: 0,
    },
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

const validateFiatApiResponse = (response: any): IFiatRates => {
  return response;
};

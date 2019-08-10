import { Action, action, Thunk, thunk } from "easy-peasy";

const BLOCKCHAIN_FIAT_API_URL = "https://blockchain.info/ticker";
const BTCSAT = 100000000;

export interface IFiatRate {
  last: number;
}

export interface IFiatRates {
  USD: IFiatRate;
}

export interface IFiatModel {
  getRate: Thunk<IFiatModel>;

  setFiatRates: Action<IFiatModel, IFiatRates>;
  convertSatToFiat: Thunk<IFiatModel, number>;
  convertFiatToSat: Thunk<IFiatModel, number>;

  fiatRates: IFiatRates;
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

  convertSatToFiat: thunk((_, sat, { getState }) => {
    const { USD } = getState().fiatRates;
    if (!USD || !USD.last) {
      return 0;
    }
    return Number.parseFloat(((sat / BTCSAT) * USD.last).toString()).toFixed(2);
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
  },
}

const validateFiatApiResponse = (response: any): IFiatRates => {
  return response;
};
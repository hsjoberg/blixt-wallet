import { Action, action, Thunk, thunk, computed, Computed } from "easy-peasy";
import { IStoreModel } from "../state";

import logger from "./../utils/log";
const log = logger("Fiat");

const BLOCKCHAIN_FIAT_API_URL = "https://blockchain.info/ticker";
const COINGECKO_CURRENCIES =
  "usd,eur,gbp,sek,aed,ars,aud,bdt,bhd,bmd,brl,cad,chf,clp,cny,czk,dkk,hkd,huf,idr,ils,inr,jpy,krw,kwd,lkr,mmk,mxn,myr,nok,nzd,php,pkr,pln,rub,sar,sgd,thb,try,twd,uah,vef,vnd,zar,xdr,xag,xau";
const COINGECKO_FIAT_API_URL =
  "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=" + COINGECKO_CURRENCIES;

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

interface ICoingeckoPriceResponse {
  bitcoin: {
    usd: number;
    aed: number;
    ars: number;
    aud: number;
    bdt: number;
    bhd: number;
    bmd: number;
    brl: number;
    cad: number;
    chf: number;
    clp: number;
    cny: number;
    czk: number;
    dkk: number;
    eur: number;
    gbp: number;
    hkd: number;
    huf: number;
    idr: number;
    ils: number;
    inr: number;
    jpy: number;
    krw: number;
    kwd: number;
    lkr: number;
    mmk: number;
    mxn: number;
    myr: number;
    nok: number;
    nzd: number;
    php: number;
    pkr: number;
    pln: number;
    rub: number;
    sar: number;
    sek: number;
    sgd: number;
    thb: number;
    try: number;
    twd: number;
    uah: number;
    vef: number;
    vnd: number;
    zar: number;
    xdr: number;
    xag: number;
    xau: number;
  };
}

export interface IFiatModel {
  getRate: Thunk<IFiatModel>;

  setFiatRates: Action<IFiatModel, IFiatRates>;

  fiatRates: IFiatRates;
  currentRate: Computed<IFiatModel, number, IStoreModel>;
}

export const fiat: IFiatModel = {
  getRate: thunk(async (actions) => {
    try {
      log.d("Fetching fiat rate from Coingecko");
      const result = await fetch(COINGECKO_FIAT_API_URL);
      const jsonResult = (await result.json()) as ICoingeckoPriceResponse;
      const parsed = {} as any;
      for (const [currency, rate] of Object.entries(jsonResult.bitcoin)) {
        parsed[currency.toUpperCase()] = { last: rate };
      }
      actions.setFiatRates(parsed);
      return;
    } catch (e: any) {
      log.e("Failed to fetch fiat rate from Coingecko: " + e.message);
      log.i("Falling back to Blockchain.info");
    }

    try {
      log.d("Fetching fiat rate from Blockchain.info");
      const result = await fetch(BLOCKCHAIN_FIAT_API_URL);
      const jsonResult = await result.json();
      if (validateFiatApiResponse(jsonResult)) {
        actions.setFiatRates(jsonResult);
      }
    } catch (e: any) {
      log.e("Failed to fetch fiat rate from Blockchain.info: " + e.message);
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

  currentRate: computed(
    [(state) => state.fiatRates, (_, storeState) => storeState.settings.fiatUnit],
    (fiatRates, fiatUnit) => {
      if (fiatRates[fiatUnit] && fiatRates[fiatUnit].last) {
        return fiatRates[fiatUnit].last;
      }
      return 0;
    },
  ),
};

const validateFiatApiResponse = (response: any): response is IFiatRates => {
  return response;
};

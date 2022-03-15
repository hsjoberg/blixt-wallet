import i18next, { i18n as i18nInstance } from "i18next";
import { initReactI18next } from "react-i18next";
import { languages, namespaces } from "./i18n.constants";
import {PLATFORM} from "../utils/constants";
//import Backend from 'i18next-chained-backend';
import HttpApi from "i18next-http-backend";

import en from "./en"
import es from "./es"



const createI18n = (language: string): i18nInstance => {
  const i18n = i18next.createInstance().use(initReactI18next);

  let backend:any = undefined;
  let res:any = undefined;
  if(PLATFORM === "web"){
    i18n.use(HttpApi);
    backend = {
      loadPath: "./locales/{{lng}}/{{ns}}.json", // Specify where backend will find translation files.
    };
  }else{
    res = {
      en:en,
      es:es
    }
  }

  i18n
    .init({
      debug:true,
      backend: backend,
      lng: language,
      fallbackLng: language,
      ns: namespaces.common,
      resources: res
  });
  
  return i18n;
  
};


export const i18n = createI18n(languages.en.id);

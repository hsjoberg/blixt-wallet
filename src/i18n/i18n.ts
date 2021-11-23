import i18next, { i18n as i18nInstance } from "i18next";
import { initReactI18next } from "react-i18next";
import { languages, namespaces } from "./i18n.constants";
import HttpApi from "i18next-http-backend";

const createI18n = (language: string): i18nInstance => {
  const i18n = i18next.createInstance().use(initReactI18next);

  i18n
    .use(HttpApi) // Use backend plugin for translation file download.
    .init({
      debug:true,
      backend: {
        loadPath: "./locales/{{lng}}/{{ns}}.json", // Specify where backend will find translation files.
      },
      lng: language,
      fallbackLng: language,
      ns: namespaces.common,
    });

  return i18n;
};

export const i18n = createI18n(languages.en);

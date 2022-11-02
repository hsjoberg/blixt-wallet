import i18next, { i18n as i18nInstance } from "i18next";
import { initReactI18next } from "react-i18next";
import { languages, namespaces } from "./i18n.constants";
import { getItemObject, StorageItem } from "../storage/app";

import en from "./en";
import es from "./es";
import de from "./de";
import fr from "./fr";
import nl from "./nl";
import tlh from "./tlh";
import sv from "./sv";
import ru from "./ru";
import pt from "./pt";
import vi from "./vi";

const createI18n = (language: string): i18nInstance => {
  const i18n = i18next.createInstance().use(initReactI18next);
  i18n.init({
    debug: true,
    lng: language,
    fallbackLng: language,
    ns: namespaces.common,
    resources: {
      en,
      es,
      de,
      fr,
      nl,
      tlh,
      sv,
      ru,
      pt,
      vi,
    },
  });

  return i18n;
};

export const i18n = createI18n(languages.en.id);

getItemObject(StorageItem.language).then((lang) => {
  if (!lang) {
    return;
  }
  i18n.changeLanguage(lang);
});

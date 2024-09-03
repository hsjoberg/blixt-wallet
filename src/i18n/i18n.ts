import i18next, { i18n as i18nInstance } from "i18next";
import { initReactI18next } from "react-i18next";
import { languages, namespaces } from "./i18n.constants";
import { getItemObject, StorageItem } from "../storage/app";

import en from "./en";
import es from "./es";
import cs from "./cs";
import da from "./da";
import de from "./de";
import hi from "./hi";
import hr from "./hr";
import it from "./it";
import ja from "./ja";
import fa from "./fa";
import fi from "./fi";
import fr from "./fr";
import ko from "./ko";
import nl from "./nl";
import no from "./no";
import pl from "./pl";
import tlh from "./tlh";
import ro from "./ro";
import sv from "./sv";
import sw from "./sw";
import swKE from "./sw_KE";
import ru from "./ru";
import pt from "./pt";
import vi from "./vi";
import zh from "./zh";
import zhHant from "./zh-Hant";
import ar from "./ar";

const createI18n = (language: string): i18nInstance => {
  const i18n = i18next.createInstance().use(initReactI18next);
  i18n.init({
    debug: false,
    lng: language,
    fallbackLng: language,
    ns: namespaces.common,
    resources: {
      en,
      es,
      cs,
      da,
      de,
      hi,
      hr,
      it,
      ja,
      fa,
      fi,
      fr,
      ko,
      nl,
      no,
      pl,
      tlh,
      ro,
      sv,
      sw,
      swKE,
      ru,
      pt,
      vi,
      zh,
      zhHant,
      ar,
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

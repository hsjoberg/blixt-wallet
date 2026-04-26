import React, { useState, useEffect } from "react";
import { formatDistanceStrict, fromUnixTime, Locale } from "date-fns";
import * as dateFnsLocales from "date-fns/locale";

import { useStoreState } from "../state/store";

import { useTranslation } from "react-i18next";
import { namespaces } from "../i18n/i18n.constants";

export interface ITickerProps {
  expire: number;
}
export const Ticker = ({ expire }: ITickerProps) => {
  const t = useTranslation(namespaces.receive.receiveQr).t;
  let language = useStoreState((store) => store.settings.language);
  if (language === "en") {
    language = "enUS";
  }
  const dateFnsLocaleMap = dateFnsLocales as Record<string, Locale>;
  let dateFnsLocale = dateFnsLocaleMap[language];
  if (!dateFnsLocale) {
    console.warn("Could not find date-fns locale for language " + language + ". Defaulting to en");
    dateFnsLocale = dateFnsLocaleMap["en"];
  }

  const [display, setDisplay] = useState(
    formatDistanceStrict(new Date(), fromUnixTime(expire), { locale: dateFnsLocale }),
  );

  useEffect(() => {
    const interval = setInterval(() => {
      setDisplay(formatDistanceStrict(new Date(), fromUnixTime(expire), { locale: dateFnsLocale }));
    }, 1000);

    return () => clearInterval(interval);
  }, [expire]);

  return (
    <>
      {t("qr.msg", { time: "" })}
      {display}
    </>
  );
};

export default Ticker;

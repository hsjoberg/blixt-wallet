import React, { useState, useEffect } from "react";
import { formatDistanceStrict, fromUnixTime, Locale } from "date-fns";

import { useStoreState } from "../state/store";

import { useTranslation } from "react-i18next";
import { namespaces } from "../i18n/i18n.constants";

// Clumsy, but not sure how bad
const dateFnsLocales = require("date-fns/locale");

export interface ITickerProps {
  expire: number;
}
export const Ticker = ({ expire }: ITickerProps) => {
  const t = useTranslation(namespaces.receive.receiveQr).t;
  const language = useStoreState((store) => store.settings.language);
  let dateFnsLocale = dateFnsLocales[language];
  if (!dateFnsLocale) {
    console.warn("Could not find date-fns locale for language " + language + ". Defaulting to en");
    dateFnsLocale = dateFnsLocales["en"];
  }

  const [display, setDisplay] = useState(formatDistanceStrict(new Date(), fromUnixTime(expire), { locale: dateFnsLocale }));

  useEffect(() => {
    const interval = setInterval(() => {
      setDisplay(
        formatDistanceStrict(new Date(), fromUnixTime(expire), { locale: dateFnsLocale })
      );
    }, 1000);

    return () => clearInterval(interval);
  }, [expire]);

  return (
    <>{t("qr.msg", { time : "" })}{display}</>
  );
};

export default Ticker;

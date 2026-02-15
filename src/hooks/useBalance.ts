import { useState, useEffect } from "react";
import {
  convertBitcoinToFiat,
  unitToSatoshi,
  valueBitcoinFromFiat,
  valueBitcoin,
  BitcoinUnits,
  isSats,
} from "../utils/bitcoin-units";
import { useStoreState } from "../state/store";
import { I18nManager, NativeModules } from "react-native";
import { PLATFORM } from "../utils/constants";

import exprEval from "expr-eval";
import { countCharInString } from "../utils";
const Parser = exprEval.Parser;
const commaLocales: string[] = [
  "en_AU",
  "en_CA",
  "en_NZ",
  "en_US",
  "fil_PH",
  "ja_JP",
  "zh_Hans_CN",
  "zh_CN",
];

export default function useBalance(initialSat?: bigint, noConversion = false) {
  const settingsManagerConstants =
    PLATFORM === "ios" ? NativeModules.SettingsManager.getConstants().settings : undefined;

  // gRPC/protobuf 0 is Number
  if (typeof initialSat === "number") {
    initialSat = undefined;
  }

  const bitcoinUnit = useStoreState((store) => store.settings.bitcoinUnit);
  const fiatUnit = useStoreState((store) => store.settings.fiatUnit);
  const currentRate = useStoreState((store) => store.fiat.currentRate);
  const toSatoshiValue = (value: number): number => {
    if (!Number.isFinite(value)) {
      return Number.NaN;
    }

    if (isSats(bitcoinUnit)) {
      value = Math.floor(value);
    }

    const satoshi = unitToSatoshi(value, bitcoinUnit);
    if (!Number.isFinite(satoshi)) {
      return Number.NaN;
    }

    return Math.floor(satoshi);
  };

  const toFiatValue = (value: number): string | undefined => {
    if (!Number.isFinite(currentRate) || currentRate <= 0) {
      return undefined;
    }

    const satoshi = toSatoshiValue(value);
    if (!Number.isFinite(satoshi)) {
      return undefined;
    }

    return convertBitcoinToFiat(satoshi, currentRate);
  };

  const [bitcoinValue, setBitcoinValue] = useState<string | undefined>(
    initialSat !== undefined ? valueBitcoin(initialSat, bitcoinUnit) : undefined,
  );
  const [dollarValue, setDollarValue] = useState<string | undefined>(
    bitcoinValue ? toFiatValue(Number.parseFloat(bitcoinValue)) : undefined,
  );

  useEffect(() => {
    if (bitcoinValue && !noConversion) {
      setDollarValue(toFiatValue(Number.parseFloat(bitcoinValue)));
    }
  }, [bitcoinUnit]);

  useEffect(() => {
    if (dollarValue && !noConversion) {
      setBitcoinValue(
        valueBitcoinFromFiat(Number.parseFloat(dollarValue), currentRate, bitcoinUnit),
      );
    }
  }, [fiatUnit]);

  return {
    onChangeBitcoinInput(text: string) {
      if (isSats(bitcoinUnit)) {
        text = text.replace(/[^0-9+\-\/*()]/g, "");
      } else {
        let replaceComma: boolean = true;
        if (PLATFORM === "ios") {
          const locale: string =
            settingsManagerConstants.AppleLocale || settingsManagerConstants.AppleLanguages[0];

          if (commaLocales.indexOf(locale) > -1) {
            replaceComma = false;
          }
        } else if (PLATFORM === "android") {
          const locale = I18nManager.getConstants().localeIdentifier;
          if (locale && commaLocales.indexOf(locale) > -1) {
            replaceComma = false;
          }
        }
        if (replaceComma) {
          text = text.replace(/,/g, ".");
        } else {
          text = text.replace(/,/g, "");
        }
      }
      if (text.length === 0) {
        setBitcoinValue(undefined);
        setDollarValue(undefined);
        return;
      }

      let fiatVal: string;
      try {
        fiatVal = evaluateExpression(text);
      } catch (e) {
        setBitcoinValue(text);
        setDollarValue(undefined);
        return;
      }

      setBitcoinValue(text);
      setDollarValue(toFiatValue(Number.parseFloat(fiatVal)));
    },
    onChangeFiatInput(text: string) {
      let replaceComma: boolean = true;
      if (PLATFORM === "ios") {
        const locale: string =
          settingsManagerConstants.AppleLocale || settingsManagerConstants.AppleLanguages[0];
        if (commaLocales.indexOf(locale) > -1) {
          replaceComma = false;
        }
      } else if (PLATFORM === "android") {
        const locale = I18nManager.getConstants().localeIdentifier;
        if (locale && commaLocales.indexOf(locale) > -1) {
          replaceComma = false;
        }
      }
      if (replaceComma) {
        text = text.replace(/,/g, ".");
      } else {
        text = text.replace(/,/g, "");
      }
      if (text.length === 0 || text[0] === ".") {
        setBitcoinValue(undefined);
        setDollarValue(undefined);
        return;
      }
      // Remove trailing math operators, otherwise expr-eval will fail
      let bitcoinVal: string;
      try {
        bitcoinVal = evaluateExpression(text);
      } catch (e) {
        setBitcoinValue(undefined);
        setDollarValue(text);
        return;
      }
      setBitcoinValue(
        valueBitcoinFromFiat(Number.parseFloat(bitcoinVal), currentRate, bitcoinUnit),
      );
      setDollarValue(text);
    },
    bitcoinValue,
    satoshiValue: (() => {
      if (!bitcoinValue) {
        return 0;
      }

      let evaluatedBitcoinValue: string;
      try {
        evaluatedBitcoinValue = evaluateExpression(bitcoinValue);
      } catch (e) {
        return Number.NaN;
      }

      const satoshi = toSatoshiValue(Number.parseFloat(evaluatedBitcoinValue));
      if (!Number.isFinite(satoshi)) {
        return Number.NaN;
      }
      return satoshi;
    })(),
    dollarValue,
    bitcoinUnit: BitcoinUnits[bitcoinUnit],
    fiatUnit,
    evalMathExpression(target: "bitcoin" | "fiat") {
      let val: string;
      try {
        val = evaluateExpression(target === "bitcoin" ? bitcoinValue || "0" : dollarValue || "0");
      } catch (e) {
        return;
      }
      if (target === "bitcoin") {
        const parsedBitcoinValue = Number.parseFloat(val);
        if (isSats(bitcoinUnit) && Number.isFinite(parsedBitcoinValue)) {
          const flooredBitcoinValue = Math.floor(parsedBitcoinValue);
          setBitcoinValue(flooredBitcoinValue.toString());
          setDollarValue(toFiatValue(flooredBitcoinValue));
          return;
        }

        setBitcoinValue(val);
        setDollarValue(toFiatValue(parsedBitcoinValue));
      } else if (target === "fiat") {
        setBitcoinValue(valueBitcoinFromFiat(Number.parseFloat(val), currentRate, bitcoinUnit));
        setDollarValue(val);
      }
    },
  };
}

function evaluateExpression(str: string) {
  str = str.replace(/\(\)/, "");
  // Remove trailing math operators, otherwise expr-eval will fail
  str = (str || "0").replace(/[+\-\/*\(]+$/, "") || "0";
  if (countCharInString(str, "(") > countCharInString(str, ")")) {
    str += ")";
  }
  try {
    str = Parser.evaluate(str).toString();
  } catch (e) {
    throw e;
  }

  return str;
}

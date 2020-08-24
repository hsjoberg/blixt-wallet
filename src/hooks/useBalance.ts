import { useState, useEffect } from "react";
import { convertBitcoinToFiat, unitToSatoshi, valueBitcoinFromFiat, valueBitcoin, BitcoinUnits } from "../utils/bitcoin-units";
import { useStoreState } from "../state/store";

import exprEval from "expr-eval";
import { countCharInString } from "../utils";
const Parser = exprEval.Parser;

export default function useBalance(initialSat?: Long) {
  // gRPC/protobuf 0 is Number
  if (typeof initialSat === "number") {
    initialSat = undefined;
  }

  const bitcoinUnit = useStoreState((store) => store.settings.bitcoinUnit);
  const fiatUnit = useStoreState((store) => store.settings.fiatUnit);
  const currentRate = useStoreState((store) => store.fiat.currentRate);

  const [bitcoinValue, setBitcoinValue] = useState<string | undefined>(initialSat && valueBitcoin(initialSat, bitcoinUnit));
  const [dollarValue, setDollarValue] = useState<string | undefined>(
    bitcoinValue && convertBitcoinToFiat(
      unitToSatoshi(Number.parseFloat(bitcoinValue), bitcoinUnit),
      currentRate,
    )
  );

  useEffect(() => {
    if (bitcoinValue) {
      setDollarValue(
        convertBitcoinToFiat(
          unitToSatoshi(Number.parseFloat(bitcoinValue), bitcoinUnit),
          currentRate,
        )
      );
    }
  }, [bitcoinUnit]);

  useEffect(() => {
    if (dollarValue) {
      setBitcoinValue(
        valueBitcoinFromFiat(Number.parseFloat(dollarValue), currentRate, bitcoinUnit)
      );
    }
  }, [fiatUnit]);

  return {
    onChangeBitcoinInput(text: string) {
      if (bitcoinUnit === "satoshi") {
        text = text.replace(/\[^0-9+\-\/*]/g, "");
      }
      else {
        text = text.replace(/,/g, ".");
      }
      if (text.length === 0) {
        setBitcoinValue(undefined);
        setDollarValue(undefined);
        return;
      }
      const fiatVal = evaluateExpression(text);
      setBitcoinValue(text);
      setDollarValue(
        convertBitcoinToFiat(
          unitToSatoshi(Number.parseFloat(fiatVal), bitcoinUnit),
          currentRate,
        )
      );
    },
    onChangeFiatInput (text: string) {
      text = text.replace(/,/g, ".");
      if (text.length === 0 || text[0] === ".") {
        setBitcoinValue(undefined);
        setDollarValue(undefined);
        return;
      }
      // Remove trailing math operators, otherwise expr-eval will fail
      const bitcoinVal = evaluateExpression(text);
      setBitcoinValue(
        valueBitcoinFromFiat(Number.parseFloat(bitcoinVal), currentRate, bitcoinUnit)
      );
      setDollarValue(text);
    },
    bitcoinValue,
    satoshiValue: unitToSatoshi(Number.parseFloat(bitcoinValue || "0"), bitcoinUnit),
    dollarValue,
    bitcoinUnit: BitcoinUnits[bitcoinUnit],
    fiatUnit,
    evalMathExpression(target: "bitcoin" | "fiat") {
      const val = evaluateExpression(target === "bitcoin" ? bitcoinValue! : dollarValue!);
      if (target === "bitcoin") {
        setBitcoinValue(val);
        setDollarValue(
          convertBitcoinToFiat(
            unitToSatoshi(Number.parseFloat(val), bitcoinUnit),
            currentRate,
          )
        );
      } else if (target === "fiat") {
        setBitcoinValue(
          valueBitcoinFromFiat(Number.parseFloat(val), currentRate, bitcoinUnit)
        );
        setDollarValue(val);
      }
    }
  }
}

function evaluateExpression(str: string) {
  // Remove trailing math operators, otherwise expr-eval will fail
  str = (str || "0").replace(/[+\-\/*\(]+$/, "") || "0";
  if (countCharInString(str, "(") > countCharInString(str, ")")) {
    str += ")";
  }
  str = str.replace(/\(\)/, "");
  try {
    str = Parser.evaluate(str).toString();
  } catch(e) {
    console.log(e);
  }

  return str;
}
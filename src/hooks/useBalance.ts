import { useState } from "react";
import { convertBitcoinToFiat, unitToSatoshi, valueBitcoinFromFiat, valueBitcoin } from "../utils/bitcoin-units";
import { useStoreState } from "../state/store";

export default (initialSat?: Long) => {
  const bitcoinUnit = useStoreState((store) => store.settings.bitcoinUnit);
  const currentRate = useStoreState((store) => store.fiat.currentRate);

  const [bitcoinValue, setBitcoinValue] = useState<string | undefined>((initialSat && valueBitcoin(initialSat, bitcoinUnit) || undefined));
  const [dollarValue, setDollarValue] = useState<string | undefined>(
    bitcoinValue && convertBitcoinToFiat(
      unitToSatoshi(Number.parseFloat(bitcoinValue), bitcoinUnit),
      currentRate,
    )
  );

  return {
    onChangeBitcoinInput: (text: string) => {
      if (bitcoinUnit === "satoshi") {
        text = text.replace(/\D+/g, "");
      }
      else {
        text = text.replace(/,/g, ".");
      }
      if (text.length === 0) {
        setBitcoinValue(undefined);
        setDollarValue(undefined);
        return;
      }
      setBitcoinValue(text);
      setDollarValue(
        convertBitcoinToFiat(
          unitToSatoshi(Number.parseFloat(text || "0"), bitcoinUnit),
          currentRate,
        )
      );
    },
    onChangeFiatInput: (text: string) => {
      text = text.replace(/,/g, ".");
      if (text.length === 0 || text[0] === ".") {
        setBitcoinValue(undefined);
        setDollarValue(undefined);
        return;
      }
      setBitcoinValue(
        valueBitcoinFromFiat(Number.parseFloat(text), currentRate, bitcoinUnit)
      );
      setDollarValue(text);
    },
    bitcoinValue,
    dollarValue,
  }
}
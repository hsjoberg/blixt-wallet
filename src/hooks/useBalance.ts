import { useState } from "react";
import { convertBitcoinToFiat, unitToSatoshi, valueBitcoinFromFiat, valueBitcoin, BitcoinUnits } from "../utils/bitcoin-units";
import { useStoreState } from "../state/store";

export default function useBalance(initialSat?: Long) {
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
    satoshiValue: unitToSatoshi(Number.parseFloat(bitcoinValue || "0"), bitcoinUnit),
    dollarValue,
    bitcoinUnit: BitcoinUnits[bitcoinUnit],
    fiatUnit,
  }
}
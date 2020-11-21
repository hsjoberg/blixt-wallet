import { useState, useEffect } from "react";
import { convertBitcoinToFiat, unitToSatoshi, valueBitcoinFromFiat, valueBitcoin, BitcoinUnits } from "../utils/bitcoin-units";
import { useStoreState, useStoreActions } from "../state/store";

import exprEval from "expr-eval";
import { countCharInString } from "../utils";
import { AppStateStatus, AppState } from "react-native";
import { useNavigation } from "@react-navigation/native";

export default function useFingerprintAuth(callback: () => void) {
  const fingerprintAvailable = useStoreState((store) => store.security.fingerprintAvailable);
  const fingerprintStartScan = useStoreActions((store) => store.security.fingerprintStartScan);
  const fingerprintStopScan = useStoreActions((store) => store.security.fingerprintStopScan);

  const startScan = async () => {
    await fingerprintStopScan();
    const r = await fingerprintStartScan();
    if (r) {
      callback();
    }
  };

  useEffect(() => {
    if (fingerprintAvailable) {
      // Workaround a bug where leaving foreground would
      // cause fingerprint scanning to not respond
      // TODO check this code
      const handler = (status: AppStateStatus) => {
        if (status === "background") {
          fingerprintStopScan();
        }
        else if (status === "active") {
          // tslint:disable-next-line: no-floating-promises
          startScan();
        }
      };
      AppState.addEventListener("change", handler);
      // tslint:disable-next-line: no-floating-promises
      startScan();

      return () => {
        fingerprintStopScan();
        AppState.removeEventListener("change", handler);
      }
    }
  }, [fingerprintAvailable]);

  return () => {
    // tslint:disable-next-line: no-floating-promises
    startScan();
  }
}
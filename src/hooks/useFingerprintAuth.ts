import { useEffect } from "react";
import { useStoreState, useStoreActions } from "../state/store";

export default function useFingerprintAuth(callback: () => void, forceEnabled: boolean = false) {
  const fingerprintAvailable = useStoreState((store) => store.security.fingerprintAvailable);
  const fingerprintEnabled = useStoreState((store) => store.security.fingerprintEnabled);
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
    if (fingerprintAvailable && (fingerprintEnabled || forceEnabled)) {
      startScan();
    }
    return () => {
      fingerprintStopScan();
      // AppState.removeEventListener("change", handler);
    }
  }, [fingerprintAvailable, fingerprintEnabled, forceEnabled]);

  return () => {
    // tslint:disable-next-line: no-floating-promises
    startScan();
  }
}
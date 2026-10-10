import { useEffect, useState } from "react";
import { useStoreState } from "../state/store";
import {
  FeePriority,
  RecommendedFees,
  fetchRecommendedFees,
  parseCustomFee,
} from "../utils/onchain-fees";

export default function useOnchainFee() {
  const [feePriority, setFeePriority] = useState<FeePriority | "custom">("medium");
  const [customFee, setCustomFee] = useState("");
  const [result, setResult] = useState<{
    server: string;
    request: number;
    fees?: RecommendedFees;
    error: boolean;
  }>();
  const [feeRequest, setFeeRequest] = useState(0);
  const feeServer = useStoreState((store) => store.settings.onchainFeeServer);
  // Ignore a previous response immediately when the server changes or a retry starts.
  const currentResult =
    result?.server === feeServer && result.request === feeRequest ? result : undefined;
  const recommendedFees = currentResult?.fees;
  const feesLoading = currentResult === undefined;
  const feesError = currentResult?.error ?? false;
  const feeRate =
    feePriority === "custom" ? parseCustomFee(customFee) : recommendedFees?.[feePriority];

  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    const timeout = setTimeout(() => controller.abort(), 15000);
    fetchRecommendedFees(feeServer, controller.signal)
      .then((fees) => {
        if (active) {
          setResult({ server: feeServer, request: feeRequest, fees, error: false });
        }
      })
      .catch(() => {
        if (active) {
          setResult({ server: feeServer, request: feeRequest, error: true });
        }
      })
      .finally(() => {
        clearTimeout(timeout);
      });
    return () => {
      active = false;
      clearTimeout(timeout);
      controller.abort();
    };
  }, [feeRequest, feeServer]);

  return {
    feeRate,
    feePriority,
    setFeePriority,
    customFee,
    setCustomFee,
    recommendedFees,
    feesLoading,
    feesError,
    retryFees: () => setFeeRequest((request) => request + 1),
  };
}

export type FeePriority = "low" | "medium" | "high";
export type RecommendedFees = Record<FeePriority, number>;

export function defaultOnchainFeeServer(chain: string): string {
  switch (chain) {
    case "mainnet":
      return "https://mempool.space/api";
    case "testnet":
    case "signet":
      return `https://mempool.space/${chain}/api`;
    default:
      // No public fee server is available for local regtest networks.
      return "";
  }
}

export function normalizeOnchainFeeServer(value: string): string {
  const server = value.trim().replace(/\/+$/, "");
  const url = new URL(server);
  if (
    !["https:", "http:"].includes(url.protocol) ||
    !url.hostname ||
    url.search ||
    url.hash ||
    url.username ||
    url.password
  ) {
    throw new Error("Invalid fee server URL");
  }
  return server;
}

export function parseCustomFee(value: string): number | undefined {
  if (!/^\d+$/.test(value.trim())) {
    return undefined;
  }
  const fee = Number(value);
  return Number.isSafeInteger(fee) && fee > 0 ? fee : undefined;
}

export async function fetchRecommendedFees(
  server: string,
  signal: AbortSignal,
): Promise<RecommendedFees> {
  const baseUrl = normalizeOnchainFeeServer(server);
  const options = {
    // Native and DOM AbortSignal declarations differ, but both support fetch cancellation.
    signal: signal as RequestInit["signal"],
  };
  let response = await fetch(`${baseUrl}/v1/fees/recommended`, options);
  const useEsplora = response.status === 404;
  if (useEsplora) {
    response = await fetch(`${baseUrl}/fee-estimates`, options);
  }
  if (!response.ok) {
    throw new Error(`Fee request failed (${response.status})`);
  }
  const data: unknown = await response.json();
  if (typeof data !== "object" || data === null) {
    throw new Error("Invalid fee recommendations");
  }
  const recommendations = data as Record<string, unknown>;
  const normalizeFee = (fee: unknown): number => {
    if (
      typeof fee !== "number" ||
      !Number.isFinite(fee) ||
      fee <= 0 ||
      fee > Number.MAX_SAFE_INTEGER
    ) {
      throw new Error("Invalid fee recommendation");
    }
    // LND's SendCoins satPerVbyte field accepts whole satoshis only.
    return Math.ceil(fee);
  };
  return {
    low: normalizeFee(useEsplora ? recommendations["6"] : recommendations.hourFee),
    medium: normalizeFee(useEsplora ? recommendations["3"] : recommendations.halfHourFee),
    high: normalizeFee(useEsplora ? recommendations["1"] : recommendations.fastestFee),
  };
}

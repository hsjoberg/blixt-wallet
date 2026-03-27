export const normalizeStore = (parsed: Record<string, unknown>): Record<string, string> =>
  Object.fromEntries(
    Object.entries(parsed).map(([key, value]) => [
      key,
      typeof value === "string" ? value : JSON.stringify(value),
    ]),
  );

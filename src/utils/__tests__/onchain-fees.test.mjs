import assert from "node:assert/strict";
import { test } from "node:test";
import {
  defaultOnchainFeeServer,
  normalizeOnchainFeeServer,
  fetchRecommendedFees,
  parseCustomFee,
  FeeServerRequiresHttpsError,
} from "../onchain-fees.ts";

const recommendations = { hourFee: 2, halfHourFee: 5, fastestFee: 9 };

test("uses the correct network and maps the three priorities", async (t) => {
  for (const [chain, path] of [
    ["mainnet", ""],
    ["testnet", "testnet/"],
    ["signet", "signet/"],
  ]) {
    const controller = new AbortController();
    t.mock.method(globalThis, "fetch", async (url, options) => {
      assert.equal(url, `https://mempool.space/${path}api/v1/fees/recommended`);
      assert.equal(options.signal, controller.signal);
      return { ok: true, json: async () => recommendations };
    });
    assert.deepEqual(
      await fetchRecommendedFees(defaultOnchainFeeServer(chain), controller.signal),
      {
        low: 2,
        medium: 5,
        high: 9,
      },
    );
    t.mock.restoreAll();
  }
});

test("rounds fractional recommendations up to LND's whole sat/vB units", async (t) => {
  t.mock.method(globalThis, "fetch", async () => ({
    ok: true,
    json: async () => ({ hourFee: 0.1, halfHourFee: 1.2, fastestFee: 2.9 }),
  }));
  assert.deepEqual(
    await fetchRecommendedFees(defaultOnchainFeeServer("mainnet"), new AbortController().signal),
    {
      low: 1,
      medium: 2,
      high: 3,
    },
  );
});

test("rejects failed requests and malformed recommendations", async (t) => {
  for (const response of [
    { ok: false, status: 503 },
    ...[
      null,
      {},
      { ...recommendations, hourFee: "2" },
      { ...recommendations, halfHourFee: 0 },
      { ...recommendations, fastestFee: -1 },
      { ...recommendations, fastestFee: Infinity },
      { ...recommendations, fastestFee: Number.MAX_SAFE_INTEGER + 1 },
    ].map((data) => ({ ok: true, json: async () => data })),
  ]) {
    t.mock.method(globalThis, "fetch", async () => response);
    await assert.rejects(
      fetchRecommendedFees(defaultOnchainFeeServer("mainnet"), new AbortController().signal),
    );
    t.mock.restoreAll();
  }
  t.mock.method(globalThis, "fetch", async () => {
    throw new Error("Network unavailable");
  });
  await assert.rejects(
    fetchRecommendedFees(defaultOnchainFeeServer("mainnet"), new AbortController().signal),
  );
});

test("does not request mainnet fees for regtest", async (t) => {
  const fetch = t.mock.method(globalThis, "fetch", async () => assert.fail("Unexpected request"));
  await assert.rejects(
    fetchRecommendedFees(defaultOnchainFeeServer("regtest"), new AbortController().signal),
  );
  assert.equal(fetch.mock.callCount(), 0);
});

test("custom fees must be positive safe integers without partial parsing", () => {
  for (const input of ["", " ", "0", "-1", "1.5", "2foo", "1e3", "Infinity", "9007199254740992"]) {
    assert.equal(parseCustomFee(input), undefined, input);
  }
  assert.equal(parseCustomFee("1"), 1);
  assert.equal(parseCustomFee(" 25 "), 25);
  assert.equal(parseCustomFee("1200"), 1200);
});

test("normalizes custom API URLs, preserving network paths and local ports", () => {
  assert.equal(
    normalizeOnchainFeeServer(" https://fees.example/signet/api/// "),
    "https://fees.example/signet/api",
  );
  assert.equal(normalizeOnchainFeeServer("http://localhost:3002/api"), "http://localhost:3002/api");
  for (const invalid of [
    "",
    "fees.example",
    "ftp://fees.example/api",
    "https://fees.example/api?x=1",
    "https://fees.example/api#fees",
    "https://user:pass@fees.example/api",
  ]) {
    assert.throws(() => normalizeOnchainFeeServer(invalid));
  }
});

test("iOS rejects cleartext public hostnames with a transport-specific error", () => {
  for (const host of [
    "fees.example.com",
    "FEES.EXAMPLE.COM",
    "fees.example.com.",
    "localhost.example.com",
    "node.local.example.com",
    "192.168.1.2.example.com",
  ]) {
    assert.throws(
      () => normalizeOnchainFeeServer(`http://${host}:3002/api`, "ios"),
      FeeServerRequiresHttpsError,
    );
    assert.equal(normalizeOnchainFeeServer(`https://${host}/api`, "ios"), `https://${host}/api`);
  }
});

test("iOS retains the HTTP endpoints allowed by NSAllowsLocalNetworking", () => {
  for (const host of [
    "localhost",
    "feeserver",
    "node.local",
    "NODE.LOCAL",
    "node.local.",
    "127.0.0.1",
    "192.168.1.2",
    "10.0.0.2",
    "172.16.0.2",
    "203.0.113.1",
    "[::1]",
    "[fd00::1]",
    "[::ffff:192.168.1.2]",
    "[2001:db8::1]",
  ]) {
    const url = `http://${host}:3002/api`;
    assert.equal(normalizeOnchainFeeServer(url, "ios"), url);
  }
  assert.throws(() => normalizeOnchainFeeServer("http://user:pass@localhost/api", "ios"));
  assert.throws(() => normalizeOnchainFeeServer("http://node.local/api?x=1", "ios"));
});

test("other platforms retain HTTP URL validation", () => {
  for (const platform of ["android", "macos", "web"]) {
    assert.equal(
      normalizeOnchainFeeServer("http://fees.example.com/api", platform),
      "http://fees.example.com/api",
    );
  }
});

test("iOS rejects a previously saved blocked server before fetching", async (t) => {
  const fetch = t.mock.method(globalThis, "fetch", async () => assert.fail("Unexpected request"));
  await assert.rejects(
    fetchRecommendedFees("http://fees.example.com/api", new AbortController().signal, "ios"),
    FeeServerRequiresHttpsError,
  );
  assert.equal(fetch.mock.callCount(), 0);
});

test("uses a custom mempool server without contacting the default server", async (t) => {
  const calls = [];
  t.mock.method(globalThis, "fetch", async (url) => {
    calls.push(url);
    return { ok: true, json: async () => recommendations };
  });
  assert.deepEqual(
    await fetchRecommendedFees("https://fees.example/custom/api/", new AbortController().signal),
    { low: 2, medium: 5, high: 9 },
  );
  assert.deepEqual(calls, ["https://fees.example/custom/api/v1/fees/recommended"]);
});

test("supports Esplora estimates when the recommendations endpoint is absent", async (t) => {
  const calls = [];
  const controller = new AbortController();
  t.mock.method(globalThis, "fetch", async (url, options) => {
    calls.push(url);
    assert.equal(options.signal, controller.signal);
    return calls.length === 1
      ? { ok: false, status: 404 }
      : { ok: true, json: async () => ({ 1: 9.1, 3: 4.2, 6: 1.5 }) };
  });
  assert.deepEqual(await fetchRecommendedFees("http://localhost:3002/api", controller.signal), {
    low: 2,
    medium: 5,
    high: 10,
  });
  assert.deepEqual(calls, [
    "http://localhost:3002/api/v1/fees/recommended",
    "http://localhost:3002/api/fee-estimates",
  ]);
});

test("does not switch servers on failure or accept incomplete Esplora estimates", async (t) => {
  let calls = [];
  t.mock.method(globalThis, "fetch", async (url) => {
    calls.push(url);
    return { ok: false, status: 503 };
  });
  await assert.rejects(
    fetchRecommendedFees("https://fees.example/api", new AbortController().signal),
  );
  assert.deepEqual(calls, ["https://fees.example/api/v1/fees/recommended"]);
  t.mock.restoreAll();
  calls = [];
  t.mock.method(globalThis, "fetch", async (url) => {
    calls.push(url);
    return calls.length === 1
      ? { ok: false, status: 404 }
      : { ok: true, json: async () => ({ 1: 10 }) };
  });
  await assert.rejects(
    fetchRecommendedFees("https://fees.example/api", new AbortController().signal),
  );
  assert.equal(calls.length, 2);
});

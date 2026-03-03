const env = import.meta.env;

if (typeof (BigInt.prototype as { toJSON?: () => unknown }).toJSON !== "function") {
  BigInt.prototype.toJSON = function () {
    return { $bigint: this.toString() };
  };
}

const chain = env.CHAIN ?? env.VITE_CHAIN ?? "mainnet";
const flavor = env.FLAVOR ?? env.VITE_FLAVOR ?? "fakelnd";
const applicationId =
  env.APPLICATION_ID ?? env.VITE_APPLICATION_ID ?? "com.blixtwallet.webdemo";
const versionCode = Number.parseInt(env.VITE_VERSION_CODE ?? "0", 10);
const buildType = env.PROD ? "release" : "debug";
const versionName = env.VITE_VERSION_NAME ?? `0.9.0-web`;
const isWebDemo = (env.BLIXT_WEB_DEMO ?? env.VITE_BLIXT_WEB_DEMO ?? "true") === "true";

Object.assign(globalThis, {
  FLAVOR: flavor,
  DEBUG: env.DEV,
  VERSION_CODE: Number.isFinite(versionCode) ? versionCode : 0,
  BUILD_TYPE: buildType,
  APPLICATION_ID: applicationId,
  VERSION_NAME: versionName,
  CHAIN: chain,
  __DEV__: env.DEV,
  BLIXT_WEB_DEMO: isWebDemo,
});

void import("../index.web.js");

const env = import.meta.env;
const runtimeGlobals = globalThis as Record<string, unknown>;

if (typeof runtimeGlobals.global === "undefined") {
  runtimeGlobals.global = globalThis;
}

if (typeof (BigInt.prototype as { toJSON?: () => unknown }).toJSON !== "function") {
  (BigInt.prototype as unknown as { toJSON: () => { $bigint: string } }).toJSON = function (
    this: bigint,
  ) {
    return { $bigint: this.toString() };
  };
}

const chain = env.CHAIN ?? env.VITE_CHAIN ?? "mainnet";
const flavor = env.FLAVOR ?? env.VITE_FLAVOR ?? "fakelnd";
const applicationId = env.APPLICATION_ID ?? env.VITE_APPLICATION_ID ?? "com.blixtwallet.web";
const versionCode = Number.parseInt(env.VITE_VERSION_CODE ?? "0", 10);
const appDevValue = env.BLIXT_DEV ?? env.VITE_BLIXT_DEV;
const appDev =
  appDevValue == null
    ? env.DEV
    : ["1", "true", "yes", "on"].includes(appDevValue.trim().toLowerCase());
const buildType = appDev ? "debug" : "release";
const versionName = env.VITE_VERSION_NAME ?? `0.9.0-web`;
const parseEnvBoolean = (value: string | boolean | undefined, fallback: boolean) => {
  if (typeof value === "boolean") {
    return value;
  }
  if (typeof value === "string") {
    return ["1", "true", "yes", "on"].includes(value.trim().toLowerCase());
  }
  return fallback;
};
const isWebDemo = parseEnvBoolean(env.BLIXT_WEB_DEMO ?? env.VITE_BLIXT_WEB_DEMO, false);
const isElectrobun =
  (env.VITE_IS_ELECTROBUN ?? "false") === "true" ||
  typeof (globalThis as { __electrobun?: unknown }).__electrobun !== "undefined";

type ElectrobunConsoleMethod = "debug" | "info" | "warn" | "error" | "trace";
type ElectrobunConsole = Console & {
  __blixtElectrobunConsoleFallbacksInstalled__?: boolean;
};

function installElectrobunConsoleFallbacks() {
  if (!isElectrobun) {
    return;
  }

  // Electrobun currently surfaces console.log reliably, but not the other levels.
  const electrobunConsole = console as ElectrobunConsole;
  if (electrobunConsole.__blixtElectrobunConsoleFallbacksInstalled__ === true) {
    return;
  }

  electrobunConsole.__blixtElectrobunConsoleFallbacksInstalled__ = true;
  const log = electrobunConsole.log.bind(electrobunConsole);

  const fallbackToLog = (level: ElectrobunConsoleMethod) => {
    return (...args: unknown[]) => {
      if (level === "trace") {
        const trace = new Error().stack?.split("\n").slice(2).join("\n");
        log("[trace]", ...args, ...(trace ? [trace] : []));
        return;
      }

      log(`[${level}]`, ...args);
    };
  };

  electrobunConsole.debug = fallbackToLog("debug");
  electrobunConsole.info = fallbackToLog("info");
  electrobunConsole.warn = fallbackToLog("warn");
  electrobunConsole.error = fallbackToLog("error");
  electrobunConsole.trace = fallbackToLog("trace");
}

installElectrobunConsoleFallbacks();

Object.assign(globalThis, {
  FLAVOR: flavor,
  DEBUG: appDev,
  VERSION_CODE: Number.isFinite(versionCode) ? versionCode : 0,
  BUILD_TYPE: buildType,
  APPLICATION_ID: applicationId,
  VERSION_NAME: versionName,
  CHAIN: chain,
  __DEV__: appDev,
  BLIXT_WEB_DEMO: isWebDemo,
  IS_ELECTROBUN: isElectrobun,
});

// Load the app only after the web globals above are assigned.
// A static ESM import is evaluated before this module body runs, which can make
// `src/utils/build.ts` observe an empty `FLAVOR` during startup.
// eslint-disable-next-line no-void
void import("../index.web.js");

import { BrowserWindow, defineElectrobunRPC } from "electrobun/bun";
import type { AdditionalElectrobunHandlers } from "react-native-turbo-lnd/electrobun/bun-rpc-factory";
import { ensureBlixtPaths } from "../backend/BlixtPaths";
import { createAsyncStorageElectrobunHandlers } from "../backend/AsyncStorage";
import { registerBackendLogListener } from "../backend/BackendLog";
import { createBlixtToolsElectrobunHandlers } from "../backend/BlixtTools";
import { createKeystoreElectrobunHandlers } from "../backend/Keystore";
import { createNativeSpeedloaderElectrobunHandlers } from "../backend/NativeSpeedloader";
import { createTurboSqliteElectrobunHandlers } from "../backend/TurboSqlite";

const DEFAULT_TURBO_LND_RPC_MAX_REQUEST_TIME_MS = 10 * 60 * 1000;
const flavor = process.env.FLAVOR?.trim().toLowerCase() ?? "normal";
const isFakeLnd = flavor === "fakelnd";

ensureBlixtPaths();

const mergeAdditionalHandlers = (
  ...handlersList: Array<AdditionalElectrobunHandlers<any>>
): AdditionalElectrobunHandlers<any> => {
  return handlersList.reduce<AdditionalElectrobunHandlers<any>>(
    (mergedHandlers, handlers) => ({
      maxRequestTime: handlers.maxRequestTime ?? mergedHandlers.maxRequestTime,
      requests: {
        ...(mergedHandlers.requests ?? {}),
        ...(handlers.requests ?? {}),
      },
      messages: {
        ...(mergedHandlers.messages ?? {}),
        ...(handlers.messages ?? {}),
      },
    }),
    {},
  );
};

const additionalHandlers = mergeAdditionalHandlers(
  createBlixtToolsElectrobunHandlers(),
  createNativeSpeedloaderElectrobunHandlers(),
  createTurboSqliteElectrobunHandlers(),
  createAsyncStorageElectrobunHandlers(),
  createKeystoreElectrobunHandlers(),
  {
    maxRequestTime: DEFAULT_TURBO_LND_RPC_MAX_REQUEST_TIME_MS,
  },
);

const appRpc = isFakeLnd // Note: TurboLnd mocks are being wired in vite.config.ts
  ? defineElectrobunRPC("bun", {
      maxRequestTime: additionalHandlers.maxRequestTime,
      handlers: {
        requests: additionalHandlers.requests ?? {},
        messages: additionalHandlers.messages ?? {},
      },
    })
  : (await import("react-native-turbo-lnd/electrobun/bun-rpc")).defineTurboLndElectrobunRPC(
      additionalHandlers,
    );

const mainWindow = new BrowserWindow({
  title: "Blixt Wallet",
  url: "views://mainview/dist/index.html",
  rpc: appRpc,
  frame: {
    width: 1600,
    height: 1030,
    x: 500,
    y: 200,
  },
});

registerBackendLogListener((entry) => {
  try {
    const level = entry.level === "warn" || entry.level === "error" ? entry.level : "log";
    const message = `[backend:${entry.level}] ${entry.message}`;
    mainWindow.webview.executeJavascript(`console.${level}(${JSON.stringify(message)});`);
  } catch (error) {
    console.error("Failed to forward backend log to webview", error);
  }
});

let didNormalizeInitialLayout = false;
mainWindow.webview.on("dom-ready", () => {
  if (didNormalizeInitialLayout) {
    return;
  }
  didNormalizeInitialLayout = true;

  // Let the RN Web tree mount before forcing viewport/layout recalculation.
  // Otherwise layout is a bit messed up (overstretch)
  setTimeout(() => {
    const { width, height } = mainWindow.getSize();
    mainWindow.setSize(width + 1, height + 1);
    setTimeout(() => {
      mainWindow.setSize(width, height);
    }, 16);
  }, 100);
});

console.log(`Blixt Electrobun app started (flavor=${flavor})`);

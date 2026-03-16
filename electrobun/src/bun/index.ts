import { BrowserWindow, defineElectrobunRPC } from "electrobun/bun";
import { createBlixtElectrobunHandlers } from "./BlixtTools";

const DEFAULT_TURBO_LND_RPC_MAX_REQUEST_TIME_MS = 10 * 60 * 1000;
const flavor = process.env.FLAVOR?.trim().toLowerCase() ?? "normal";
const isFakeLnd = flavor === "fakelnd";

const additionalHandlers = {
  ...createBlixtElectrobunHandlers(),
  maxRequestTime: DEFAULT_TURBO_LND_RPC_MAX_REQUEST_TIME_MS,
};

const appRpc = isFakeLnd
  ? defineElectrobunRPC("bun", {
      maxRequestTime: additionalHandlers.maxRequestTime,
      handlers: {
        requests: additionalHandlers.requests ?? {},
        messages: additionalHandlers.messages ?? {},
      },
    })
  : (
      await import("react-native-turbo-lnd/electrobun/bun-rpc")
    ).defineTurboLndElectrobunRPC(additionalHandlers);

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

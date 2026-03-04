import { BrowserWindow } from "electrobun/bun";
import { defineTurboLndElectrobunRPC } from "react-native-turbo-lnd/electrobun/bun-rpc";

const appRpc = defineTurboLndElectrobunRPC();

const mainWindow = new BrowserWindow({
  title: "Blixt Wallet",
  url: "views://mainview/dist/index.html",
  rpc: appRpc,
  frame: {
    width: 1400,
    height: 900,
    x: 200,
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

console.log("Blixt Electrobun app started");

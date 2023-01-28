import { app, BrowserWindow, ipcMain } from "electron";

let appWindow = null;

const createWindow = () => {
  appWindow = new BrowserWindow({
    width: 1225,
    height: 860,
    show: false,
    webPreferences: {
      preload: MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY,
      nodeIntegration: true,
      // contextIsolation: false,
      // enableRemoteModule: true,
    },
  });

  appWindow.once("ready-to-show", () => {
    appWindow.show();
  });

  appWindow.loadURL(MAIN_WINDOW_WEBPACK_ENTRY);
};

const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  const { sendOpenURL } = require("react-native-electron/main");

  app.on("second-instance", (event, argv) => {
    if (appWindow != null) {
      if (appWindow.isMinimized()) {
        appWindow.restore();
      }
      if (typeof argv[1] === "string") {
        sendOpenURL(argv[1]);
      }
      appWindow.focus();
    }
  });

  app.on("window-all-closed", () => {
    if (process.platform !== "darwin") {
      app.quit();
    }
  });

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });

  app.whenReady().then(() => {
    createWindow();
  });
}

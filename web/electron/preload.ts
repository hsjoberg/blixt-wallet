import "react-native-electron/preload";
import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("lndmobile", {
  hello: () => {
    ipcRenderer.send("blixt-prompt");
    return 123;
  }
});

import { electrobunNativeSpeedloader } from "../../electrobun/src/shims/native-speedloader";
import type { Spec } from "./NativeSpeedloader";

const NativeSpeedloaderElectrobun: Spec = {
  gossipSync: async (serviceUrl, cacheDir, filesDir) => {
    return await electrobunNativeSpeedloader.gossipSync(serviceUrl, cacheDir, filesDir);
  },

  cancelGossipSync: () => {
    electrobunNativeSpeedloader.cancelGossipSync();
  },
};

export default NativeSpeedloaderElectrobun;

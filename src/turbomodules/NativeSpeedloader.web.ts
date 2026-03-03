import type { Spec } from "./NativeSpeedloader";

const NativeSpeedloaderWeb: Spec = {
  gossipSync: async () => "",
  cancelGossipSync() {},
};

export default NativeSpeedloaderWeb;

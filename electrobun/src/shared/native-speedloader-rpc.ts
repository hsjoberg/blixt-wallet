import type { Spec } from "../../../src/turbomodules/NativeSpeedloader";

export type NativeSpeedloaderGossipSyncParams = Parameters<Spec["gossipSync"]>;
export type NativeSpeedloaderGossipSyncResponse = Awaited<ReturnType<Spec["gossipSync"]>>;

export const NativeSpeedloaderRpcMethodNames = {
  gossipSync: "__NativeSpeedloaderGossipSync",
  cancelGossipSync: "__NativeSpeedloaderCancelGossipSync",
} as const;

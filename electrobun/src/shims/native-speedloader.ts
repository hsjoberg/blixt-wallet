import { electrobunRequest } from "../shared/rpc-client.web";
import {
  NativeSpeedloaderRpcMethodNames,
  type NativeSpeedloaderGossipSyncParams,
  type NativeSpeedloaderGossipSyncResponse,
} from "../shared/native-speedloader-rpc";

export const electrobunNativeSpeedloader = {
  gossipSync: async (
    ...params: NativeSpeedloaderGossipSyncParams
  ): Promise<NativeSpeedloaderGossipSyncResponse> => {
    return await electrobunRequest<NativeSpeedloaderGossipSyncResponse>(
      NativeSpeedloaderRpcMethodNames.gossipSync,
      params,
    );
  },

  cancelGossipSync: () => {
    void electrobunRequest<void>(NativeSpeedloaderRpcMethodNames.cancelGossipSync, []);
  },
};

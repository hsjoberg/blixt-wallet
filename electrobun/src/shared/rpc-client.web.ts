import { invokeElectrobunRequest } from "react-native-turbo-lnd/electrobun/custom-rpc";

const DEFAULT_BLIXT_RPC_MAX_REQUEST_TIME_MS = 10 * 60 * 1000;
const runtimeGlobals = globalThis as Record<string, unknown>;

export const isElectrobunRuntime = () =>
  runtimeGlobals.IS_ELECTROBUN === true || typeof runtimeGlobals.__electrobun !== "undefined";

export const electrobunRequest = async <TResponse = unknown>(
  method: string,
  params?: unknown,
): Promise<TResponse> => {
  if (!isElectrobunRuntime()) {
    throw new Error(`Electrobun RPC request \"${method}\" called outside Electrobun runtime.`);
  }

  try {
    return await invokeElectrobunRequest<TResponse>(method, params);
  } catch (error) {
    if (error instanceof Error && error.message === "RPC request timed out.") {
      throw new Error(
        `Electrobun RPC request \"${method}\" timed out after ${DEFAULT_BLIXT_RPC_MAX_REQUEST_TIME_MS} ms.`,
      );
    }
    throw error;
  }
};

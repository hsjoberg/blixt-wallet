import type { CodegenTypes } from "react-native";
import { electrobunRequest } from "../shared/rpc-client.web";
import {
  type BlixtToolsElectrobunMethod,
  type BlixtToolsRpcParams,
  type BlixtToolsRpcResponse,
  toBlixtToolsRpcMethodName,
} from "../shared/blixt-tools-rpc";

type EventListener<TPayload> = (payload: TPayload) => void;
type EventSubscription = {
  remove(): void;
};

type ReadLogDeltaResponse = {
  text: string;
  nextOffset: number;
};

type LogCursorResponse = {
  nextOffset: number;
};

const createEventEmitter = <TPayload>() => {
  const listeners = new Set<EventListener<TPayload>>();

  return {
    emit(payload: TPayload) {
      for (const listener of listeners) {
        listener(payload);
      }
    },
    subscribe(listener: EventListener<TPayload>): EventSubscription {
      listeners.add(listener);
      return {
        remove() {
          listeners.delete(listener);
        },
      };
    },
    hasListeners() {
      return listeners.size > 0;
    },
  };
};

const lndLogEmitter = createEventEmitter<string>();
const lndLogPollState: {
  timerId: number | null;
  nextOffset: number;
  pollInFlight: boolean;
} = {
  timerId: null,
  nextOffset: 0,
  pollInFlight: false,
};

const isElectrobunRuntime = () => {
  const runtimeGlobals = globalThis as Record<string, unknown>;
  return (
    runtimeGlobals.IS_ELECTROBUN === true || typeof runtimeGlobals.__electrobun !== "undefined"
  );
};

const requestElectrobun = async <TResponse = unknown>(
  method: string,
  params?: unknown,
): Promise<TResponse | null> => {
  if (!isElectrobunRuntime()) {
    return null;
  }

  return await electrobunRequest<TResponse>(method, params);
};

const requestBlixtTool = async <Method extends BlixtToolsElectrobunMethod>(
  method: Method,
  ...params: BlixtToolsRpcParams<Method>
): Promise<BlixtToolsRpcResponse<Method> | null> => {
  return await requestElectrobun<BlixtToolsRpcResponse<Method>>(
    toBlixtToolsRpcMethodName(method),
    params,
  );
};

const syncLndLogCursor = async () => {
  const response = await requestElectrobun<LogCursorResponse>("__BlixtToolsGetLndLogCursor");
  lndLogPollState.nextOffset = response?.nextOffset ?? 0;
};

const stopObservingLndLogFile = () => {
  if (lndLogPollState.timerId === null) {
    return;
  }

  globalThis.clearInterval(lndLogPollState.timerId);
  lndLogPollState.timerId = null;
};

const pollLndLogDelta = async () => {
  if (!isElectrobunRuntime() || lndLogPollState.pollInFlight) {
    return;
  }

  lndLogPollState.pollInFlight = true;
  try {
    const response = await requestElectrobun<ReadLogDeltaResponse>("__BlixtToolsReadLndLogDelta", {
      offset: lndLogPollState.nextOffset,
    });
    if (response === null) {
      return;
    }

    lndLogPollState.nextOffset = response.nextOffset;
    if (response.text.length > 0) {
      lndLogEmitter.emit(response.text);
    }
  } finally {
    lndLogPollState.pollInFlight = false;
    if (!lndLogEmitter.hasListeners()) {
      stopObservingLndLogFile();
    }
  }
};

export const electrobunNativeBlixtTools = {
  writeConfig: async (config: string) => {
    return (await requestBlixtTool("writeConfig", config)) ?? "";
  },

  generateSecureRandomAsBase64: async (length: number) => {
    return await requestBlixtTool("generateSecureRandomAsBase64", length);
  },

  log: async (level: "v" | "d" | "i" | "w" | "e", tag: string, message: string) => {
    await requestBlixtTool("log", level, tag, message);
  },

  restartApp: async () => {
    await requestBlixtTool("restartApp");
  },

  tailLog: async (numberOfLines: number) => {
    const response = await requestBlixtTool("tailLog", numberOfLines);
    if (response === null) {
      return "";
    }

    await syncLndLogCursor();
    return response;
  },

  observeLndLogFile: async () => {
    const started = await requestBlixtTool("observeLndLogFile");
    if (started !== true) {
      return false;
    }

    if (lndLogPollState.timerId !== null) {
      return true;
    }

    await syncLndLogCursor();
    lndLogPollState.timerId = globalThis.setInterval(() => {
      void pollLndLogDelta();
    }, 1000);

    return true;
  },

  tailSpeedloaderLog: async (numberOfLines: number) => {
    return (await requestBlixtTool("tailSpeedloaderLog", numberOfLines)) ?? "";
  },

  DEBUG_deleteSpeedloaderLastrunFile: async () => {
    return (await requestBlixtTool("DEBUG_deleteSpeedloaderLastrunFile")) ?? false;
  },

  DEBUG_deleteSpeedloaderDgraphDirectory: async () => {
    return (await requestBlixtTool("DEBUG_deleteSpeedloaderDgraphDirectory")) ?? false;
  },

  getCacheDir: async () => {
    return (await requestBlixtTool("getCacheDir")) ?? "/tmp";
  },

  getFilesDir: async () => {
    return (await requestBlixtTool("getFilesDir")) ?? "/";
  },

  getAppFolderPath: async () => {
    return (await requestBlixtTool("getAppFolderPath")) ?? "/";
  },

  onLndLog: ((listener: EventListener<string>) => {
    const subscription = lndLogEmitter.subscribe(listener);
    return {
      remove() {
        subscription.remove();
        if (!lndLogEmitter.hasListeners()) {
          stopObservingLndLogFile();
        }
      },
    };
  }) as CodegenTypes.EventEmitter<string>,
};

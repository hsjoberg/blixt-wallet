import type { CodegenTypes } from "react-native";
import { electrobunRequest } from "../../electrobun/src/shared/rpc-client.web";

import type { BuildChain, Spec } from "./NativeBlixtTools";

const chain = ((globalThis as Record<string, unknown>).CHAIN ?? "mainnet") as BuildChain;
const debug = Boolean((globalThis as Record<string, unknown>).DEBUG ?? false);
const flavor = String((globalThis as Record<string, unknown>).FLAVOR ?? "fakelnd");
const applicationId = String(
  (globalThis as Record<string, unknown>).APPLICATION_ID ?? "com.blixtwallet.webdemo",
);
const versionName = String((globalThis as Record<string, unknown>).VERSION_NAME ?? "0.9.0-web");
const versionCode = Number((globalThis as Record<string, unknown>).VERSION_CODE ?? 0);
const buildType = String((globalThis as Record<string, unknown>).BUILD_TYPE ?? "debug");

type EventListener<TPayload> = (payload: TPayload) => void;
type EventSubscription = {
  remove(): void;
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

type ReadLogResponse = {
  text: string;
  nextOffset: number;
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

const readElectrobunLog = async (
  kind: "lnd" | "speedloader",
  options: {
    offset?: number;
    maxLines?: number;
  } = {},
): Promise<ReadLogResponse | null> => {
  return await requestElectrobun<ReadLogResponse>("__BlixtReadLog", {
    kind,
    ...options,
  });
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
    const response = await readElectrobunLog("lnd", {
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

const NativeBlixtToolsWeb: Spec = {
  getFlavor: () => flavor,
  getDebug: () => debug,
  getVersionCode: () => versionCode,
  getBuildType: () => buildType,
  getApplicationId: () => applicationId,
  getVersionName: () => versionName,
  getAppleTeamId: () => "",
  getChain: () => chain,

  writeConfig: async (config) => {
    const result = await requestElectrobun<{ path: string }>("__BlixtWriteConfig", {
      config,
    });
    return result?.path ?? "";
  },
  generateSecureRandomAsBase64: async (length) => {
    const randomFromBridge = await requestElectrobun<string>(
      "__BlixtGenerateSecureRandomAsBase64",
      {
        length,
      },
    );
    if (typeof randomFromBridge === "string" && randomFromBridge.length > 0) {
      return randomFromBridge;
    }

    const data = new Uint8Array(length);
    crypto.getRandomValues(data);
    return btoa(String.fromCharCode(...data));
  },
  log: (_level, tag, message) => {
    console.log(`${tag}: ${message}`);
  },
  saveLogs: async () => "",
  copyLndLog: async () => false,
  copySpeedloaderLog: async () => false,
  tailLog: async (numberOfLines) => {
    const response = await readElectrobunLog("lnd", {
      maxLines: numberOfLines,
    });
    if (response === null) {
      return "";
    }

    lndLogPollState.nextOffset = response.nextOffset;
    return response.text;
  },
  observeLndLogFile: async () => {
    if (!isElectrobunRuntime()) {
      return false;
    }

    if (lndLogPollState.timerId !== null) {
      return true;
    }

    lndLogPollState.timerId = globalThis.setInterval(() => {
      pollLndLogDelta();
    }, 1000);

    return true;
  },
  tailSpeedloaderLog: async (numberOfLines) => {
    const response = await readElectrobunLog("speedloader", {
      maxLines: numberOfLines,
    });
    return response?.text ?? "";
  },
  saveChannelsBackup: async () => false,
  saveChannelBackupFile: async () => false,
  getTorEnabled: async () => false,
  DEBUG_deleteSpeedloaderLastrunFile: async () => true,
  DEBUG_deleteSpeedloaderDgraphDirectory: async () => true,
  DEBUG_deleteNeutrinoFiles: async () => true,
  getInternalFiles: async () => ({}),
  getCacheDir: async () => (await requestElectrobun<string>("__BlixtGetCacheDir")) ?? "/tmp",
  getFilesDir: async () => (await requestElectrobun<string>("__BlixtGetFilesDir")) ?? "/",
  getAppFolderPath: async () => (await requestElectrobun<string>("__BlixtGetAppFolderPath")) ?? "/",
  saveChannelDbFile: async () => false,
  importChannelDbFile: async () => false,
  getIntentStringData: async () => null,
  getIntentNfcData: async () => null,
  DEBUG_deleteWallet: async () => true,
  DEBUG_deleteDatafolder: async () => true,
  restartApp: () => {
    location.reload();
  },
  checkICloudEnabled: async () => false,
  checkApplicationSupportExists: async () => true,
  createIOSApplicationSupportAndLndDirectories: async () => true,
  excludeLndICloudBackup: async () => true,
  macosOpenFileDialog: async () => null,
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

export default NativeBlixtToolsWeb;

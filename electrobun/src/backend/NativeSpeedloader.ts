import { CString, JSCallback, dlopen, ptr, toArrayBuffer, type Pointer } from "bun:ffi";
import { existsSync } from "node:fs";
import path from "node:path";
import type { AdditionalElectrobunHandlers } from "react-native-turbo-lnd/electrobun/bun-rpc-factory";
import {
  NativeSpeedloaderRpcMethodNames,
  type NativeSpeedloaderGossipSyncParams,
} from "../shared/native-speedloader-rpc";

const CALLBACK_STRUCT_SIZE_BYTES = 32;
const CALLBACK_CLOSE_GRACE_MS = 5000;
const DEFAULT_PARENT_SEARCH_DEPTH = 8;
const CALLBACK_CONTEXT_START = 0x200000000n;

type DllResolution = {
  path: string | null;
  checked: string[];
};

type SpeedloaderSymbols = {
  gossipSync: {
    args: readonly ["ptr", "ptr", "ptr", "ptr", "ptr"];
    returns: "void";
  };
  cancelGossipSync: {
    args: readonly [];
    returns: "void";
  };
  lndFree: {
    args: readonly ["ptr"];
    returns: "void";
  };
};

type SpeedloaderLibrary = ReturnType<typeof dlopen<SpeedloaderSymbols>>;

type InFlightGossipSync = {
  reject: (error: Error) => void;
  responseCallback: JSCallback;
  errorCallback: JSCallback;
  callbackStruct: ArrayBuffer;
  cleanupTimer: ReturnType<typeof setTimeout> | null;
  settled: boolean;
  cancelled: boolean;
};

let nextCallbackContext = CALLBACK_CONTEXT_START;
let speedloaderLibrary: SpeedloaderLibrary | null = null;
let activeGossipSync: InFlightGossipSync | null = null;

function getLndLibraryFilename(): string {
  switch (process.platform) {
    case "win32":
      return "liblnd.dll";
    case "linux":
      return "liblnd.so";
    case "darwin":
      return "liblnd.dylib";
    default:
      throw new Error(`Unsupported platform for Speedloader Electrobun bridge: ${process.platform}`);
  }
}

function pointerToBigInt(value: Pointer | null): bigint {
  if (value === null) {
    return 0n;
  }

  return BigInt(value);
}

function allocateCallbackContexts() {
  const responseContext = nextCallbackContext;
  const errorContext = nextCallbackContext + 1n;
  nextCallbackContext += 2n;
  return { responseContext, errorContext };
}

function createCallbackStruct(onResponsePtr: Pointer | null, onErrorPtr: Pointer | null) {
  const { responseContext, errorContext } = allocateCallbackContexts();
  const callbackStruct = new ArrayBuffer(CALLBACK_STRUCT_SIZE_BYTES);
  const view = new DataView(callbackStruct);
  view.setBigUint64(0, pointerToBigInt(onResponsePtr), true);
  view.setBigUint64(8, pointerToBigInt(onErrorPtr), true);
  view.setBigUint64(16, responseContext, true);
  view.setBigUint64(24, errorContext, true);
  return callbackStruct;
}

function resolveLndLibraryPath(): DllResolution {
  const checked: string[] = [];
  const seen = new Set<string>();
  const filename = getLndLibraryFilename();

  const checkCandidate = (candidatePath: string): string | null => {
    const absolutePath = path.resolve(candidatePath);
    if (seen.has(absolutePath)) {
      return null;
    }

    seen.add(absolutePath);
    checked.push(absolutePath);
    return existsSync(absolutePath) ? absolutePath : null;
  };

  const execDir = path.dirname(process.execPath);
  const candidatePaths = [
    path.join(process.cwd(), filename),
    path.join(execDir, filename),
    path.join(execDir, "..", "Resources", "app", filename),
    path.join(execDir, "..", "Resources", filename),
  ];

  for (const candidatePath of candidatePaths) {
    const foundPath = checkCandidate(candidatePath);
    if (foundPath !== null) {
      return { path: foundPath, checked };
    }
  }

  let currentDir = process.cwd();
  for (let level = 0; level < DEFAULT_PARENT_SEARCH_DEPTH; level += 1) {
    const foundPath = checkCandidate(path.join(currentDir, filename));
    if (foundPath !== null) {
      return { path: foundPath, checked };
    }

    const parentDir = path.dirname(currentDir);
    if (parentDir === currentDir) {
      break;
    }

    currentDir = parentDir;
  }

  return { path: null, checked };
}

function getSpeedloaderLibrary(): SpeedloaderLibrary {
  if (speedloaderLibrary !== null) {
    return speedloaderLibrary;
  }

  const dllResolution = resolveLndLibraryPath();
  if (dllResolution.path === null) {
    throw new Error(
      [
        `Unable to find ${getLndLibraryFilename()} for Speedloader Electrobun bridge.`,
        `cwd=${process.cwd()}`,
        `execPath=${process.execPath}`,
        "Checked paths:",
        ...dllResolution.checked.map((entry) => `  - ${entry}`),
      ].join("\n"),
    );
  }

  speedloaderLibrary = dlopen<SpeedloaderSymbols>(dllResolution.path, {
    gossipSync: { args: ["ptr", "ptr", "ptr", "ptr", "ptr"], returns: "void" },
    cancelGossipSync: { args: [], returns: "void" },
    lndFree: { args: ["ptr"], returns: "void" },
  });

  return speedloaderLibrary;
}

function scheduleCleanup(inFlight: InFlightGossipSync) {
  if (inFlight.cleanupTimer !== null) {
    return;
  }

  inFlight.cleanupTimer = setTimeout(() => {
    inFlight.responseCallback.close();
    inFlight.errorCallback.close();
    inFlight.cleanupTimer = null;
  }, CALLBACK_CLOSE_GRACE_MS);
}

function settleActiveGossipSync(success: true, payload: string): void;
function settleActiveGossipSync(success: false, payload: Error): void;
function settleActiveGossipSync(success: boolean, payload: string | Error) {
  const inFlight = activeGossipSync;
  if (inFlight === null || inFlight.settled) {
    return;
  }

  inFlight.settled = true;
  activeGossipSync = null;
  scheduleCleanup(inFlight);

  if (!success) {
    inFlight.reject(payload as Error);
  }
}

function decodeNativeError(symbols: SpeedloaderLibrary["symbols"], errorPtr: Pointer | null) {
  let message = "Unknown Speedloader error.";
  try {
    if (errorPtr !== null && errorPtr !== 0) {
      message = new CString(errorPtr).toString();
    }
  } finally {
    if (errorPtr !== null && errorPtr !== 0) {
      symbols.lndFree(errorPtr);
    }
  }

  return message;
}

function createGossipSyncPromise(...params: NativeSpeedloaderGossipSyncParams): Promise<string> {
  if (activeGossipSync !== null && !activeGossipSync.settled) {
    throw new Error("Speedloader gossip sync is already running.");
  }

  const [serviceUrl, cacheDir, filesDir] = params;
  const library = getSpeedloaderLibrary();
  const symbols = library.symbols;

  let resolvePromise: ((value: string) => void) | null = null;
  let rejectPromise: ((error: Error) => void) | null = null;

  const responseCallback = new JSCallback(
    (_ctx: Pointer | null, responsePtr: Pointer | null, length: number) => {
      const inFlight = activeGossipSync;
      if (inFlight === null) {
        if (responsePtr !== null && responsePtr !== 0) {
          symbols.lndFree(responsePtr);
        }
        return;
      }

      let payload = "";
      try {
        if (responsePtr !== null && responsePtr !== 0 && length > 0) {
          payload = Buffer.from(toArrayBuffer(responsePtr, 0, length)).toString("utf8");
        }
      } finally {
        if (responsePtr !== null && responsePtr !== 0) {
          symbols.lndFree(responsePtr);
        }
      }

      if (inFlight.cancelled) {
        settleActiveGossipSync(false, new Error("Gossip sync cancelled by user"));
        return;
      }

      resolvePromise?.(payload);
      settleActiveGossipSync(true, payload);
    },
    { args: ["ptr", "ptr", "i32"], returns: "void", threadsafe: true },
  );

  const errorCallback = new JSCallback(
    (_ctx: Pointer | null, errorPtr: Pointer | null) => {
      const message = decodeNativeError(symbols, errorPtr);
      const inFlight = activeGossipSync;
      if (inFlight !== null && inFlight.cancelled) {
        settleActiveGossipSync(false, new Error("Gossip sync cancelled by user"));
        return;
      }

      const error = new Error(message);
      settleActiveGossipSync(false, error);
    },
    { args: ["ptr", "ptr"], returns: "void", threadsafe: true },
  );

  const callbackStruct = createCallbackStruct(responseCallback.ptr, errorCallback.ptr);

  const promise = new Promise<string>((resolve, reject) => {
    resolvePromise = resolve;
    rejectPromise = reject;
  });

  activeGossipSync = {
    reject: (error: Error) => {
      rejectPromise?.(error);
    },
    responseCallback,
    errorCallback,
    callbackStruct,
    cleanupTimer: null,
    settled: false,
    cancelled: false,
  };

  symbols.gossipSync(
    Buffer.from(`${serviceUrl}\0`),
    Buffer.from(`${cacheDir}\0`),
    Buffer.from(`${filesDir}\0`),
    Buffer.from("wifi\0"),
    ptr(callbackStruct),
  );

  return promise;
}

function cancelActiveGossipSync() {
  const inFlight = activeGossipSync;
  if (inFlight === null || inFlight.settled) {
    return;
  }

  inFlight.cancelled = true;
  getSpeedloaderLibrary().symbols.cancelGossipSync();
  settleActiveGossipSync(false, new Error("Gossip sync cancelled by user"));
}

export const createNativeSpeedloaderElectrobunHandlers = (): AdditionalElectrobunHandlers<any> => {
  return {
    requests: {
      [NativeSpeedloaderRpcMethodNames.gossipSync]: async (params: NativeSpeedloaderGossipSyncParams) => {
        return await createGossipSyncPromise(...params);
      },

      [NativeSpeedloaderRpcMethodNames.cancelGossipSync]: async () => {
        cancelActiveGossipSync();
      },
    },
  };
};

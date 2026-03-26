import { randomBytes } from "node:crypto";
import { existsSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { Utils } from "electrobun/bun";
import type { AdditionalElectrobunHandlers } from "react-native-turbo-lnd/electrobun/bun-rpc-factory";
import {
  BlixtCachePath,
  BlixtChain,
  BlixtLndConfigPath,
  BlixtLndPath,
  BlixtRootPath,
  ensureDirectory,
  normalizeFsPath,
} from "./BlixtPaths";
import { backendLog, type BackendLogLevel } from "./BackendLog";
import {
  BlixtToolsElectrobunMethods,
  type BlixtToolsElectrobunAsyncImplementation,
  type BlixtToolsElectrobunMethod,
  type BlixtToolsRpcMethodName,
  type BlixtToolsRpcParams,
  type BlixtToolsRpcResponse,
  toBlixtToolsRpcMethodName,
} from "../shared/blixt-tools-rpc";

const resolveLndLogPath = () =>
  path.resolve(BlixtLndPath, "logs", "bitcoin", BlixtChain, "lnd.log");

const resolveSpeedloaderLogPath = () => path.resolve(BlixtCachePath, "log", "speedloader.log");
const resolveSpeedloaderLastrunPath = () => path.resolve(BlixtCachePath, "lastrun");
const resolveSpeedloaderDgraphPath = () => path.resolve(BlixtCachePath, "dgraph");

const ensureLogParentDirectory = (targetPath: string) => {
  ensureDirectory(path.dirname(targetPath));
};

const tailFile = (targetPath: string, numberOfLines: number): string => {
  ensureLogParentDirectory(targetPath);
  if (!existsSync(targetPath)) {
    return "";
  }

  const text = readFileSync(targetPath, "utf8");
  const parsedNumberOfLines = Math.max(0, Math.floor(Number(numberOfLines) || 0));
  if (parsedNumberOfLines === 0) {
    return text;
  }

  return text.split(/\r?\n/).slice(-parsedNumberOfLines).join("\n");
};

const readFileDelta = (targetPath: string, offset: number) => {
  ensureLogParentDirectory(targetPath);
  if (!existsSync(targetPath)) {
    return {
      text: "",
      nextOffset: 0,
    };
  }

  const content = readFileSync(targetPath);
  const nextOffset = content.byteLength;
  const parsedOffset = Number(offset);
  const safeOffset =
    Number.isFinite(parsedOffset) && parsedOffset >= 0 && parsedOffset <= nextOffset
      ? parsedOffset
      : 0;

  return {
    text: content.subarray(safeOffset).toString("utf8"),
    nextOffset,
  };
};

const getLndLogCursor = () => {
  const logPath = resolveLndLogPath();
  ensureLogParentDirectory(logPath);
  if (!existsSync(logPath)) {
    return {
      nextOffset: 0,
    };
  }

  return {
    nextOffset: readFileSync(logPath).byteLength,
  };
};

const deletePathIfPresent = (targetPath: string) => {
  if (!existsSync(targetPath)) {
    return false;
  }

  rmSync(targetPath, { force: false, recursive: true });
  return !existsSync(targetPath);
};

const resolveElectrobunRestartTarget = () => {
  const launcherNames =
    process.platform === "win32" ? ["launcher.exe", "launcher"] : ["launcher", "launcher.exe"];
  const execPath = path.resolve(process.execPath);
  const execDir = path.dirname(execPath);
  const candidateDirectories = [
    path.resolve(process.cwd()),
    execDir,
    path.resolve(execDir, ".."),
    path.resolve(execDir, "..", "MacOS"),
  ];
  const uniqueDirectories = [...new Set(candidateDirectories)];

  if (launcherNames.includes(path.basename(execPath).toLowerCase()) && existsSync(execPath)) {
    return {
      executable: execPath,
      cwd: execDir,
    };
  }

  for (const directory of uniqueDirectories) {
    for (const launcherName of launcherNames) {
      const executable = path.resolve(directory, launcherName);
      if (existsSync(executable)) {
        return {
          executable,
          cwd: directory,
        };
      }
    }
  }

  throw new Error(
    [
      "Unable to resolve Electrobun launcher for restart.",
      `process.execPath=${execPath}`,
      `process.cwd()=${process.cwd()}`,
      "Checked directories:",
      ...uniqueDirectories.map((directory) => `  - ${directory}`),
    ].join("\n"),
  );
};

const restartElectrobunAppProcess = () => {
  const restartTarget = resolveElectrobunRestartTarget();
  backendLog("info", `Restarting Electrobun app via ${restartTarget.executable}`);

  const replacementProcess = Bun.spawn([restartTarget.executable], {
    cwd: restartTarget.cwd,
    stdio: ["ignore", "ignore", "ignore"],
  });

  if (typeof replacementProcess.unref === "function") {
    replacementProcess.unref();
  }

  globalThis.setTimeout(() => {
    Utils.quit();
  }, 50);
};

type BlixtToolsRpcRequestHandlers = {
  [Method in BlixtToolsElectrobunMethod as BlixtToolsRpcMethodName<Method>]: (
    params: BlixtToolsRpcParams<Method>,
  ) => Promise<BlixtToolsRpcResponse<Method>>;
};

const blixtToolsImplementation = {
  writeConfig: async (config: string) => {
    writeFileSync(BlixtLndConfigPath, config, "utf8");

    return normalizeFsPath(BlixtLndConfigPath);
  },

  generateSecureRandomAsBase64: async (length: number) => {
    const parsedLength = Number(length);
    if (!Number.isFinite(parsedLength) || parsedLength <= 0) {
      throw new Error("Invalid generateSecureRandomAsBase64 payload.");
    }

    return randomBytes(Math.floor(parsedLength)).toString("base64");
  },

  log: async (level: "v" | "d" | "i" | "w" | "e", tag: string, message: string) => {
    const backendLevel: BackendLogLevel =
      level === "v" || level === "d"
        ? "debug"
        : level === "i"
          ? "info"
          : level === "w"
            ? "warn"
            : "error";

    backendLog(backendLevel, `${tag}: ${message}`);
  },

  restartApp: async () => {
    restartElectrobunAppProcess();
  },

  getFilesDir: async () => {
    return normalizeFsPath(BlixtLndPath);
  },

  getCacheDir: async () => {
    return normalizeFsPath(BlixtCachePath);
  },

  getAppFolderPath: async () => {
    return `${normalizeFsPath(BlixtRootPath)}/`;
  },

  tailLog: async (numberOfLines: number) => {
    return tailFile(resolveLndLogPath(), numberOfLines);
  },

  observeLndLogFile: async () => {
    ensureLogParentDirectory(resolveLndLogPath());
    return true;
  },

  tailSpeedloaderLog: async (numberOfLines: number) => {
    return tailFile(resolveSpeedloaderLogPath(), numberOfLines);
  },

  DEBUG_deleteSpeedloaderLastrunFile: async () => {
    return deletePathIfPresent(resolveSpeedloaderLastrunPath());
  },

  DEBUG_deleteSpeedloaderDgraphDirectory: async () => {
    return deletePathIfPresent(resolveSpeedloaderDgraphPath());
  },
} satisfies BlixtToolsElectrobunAsyncImplementation;

const createBlixtToolsRpcRequests = (): BlixtToolsRpcRequestHandlers => {
  const requests = {} as BlixtToolsRpcRequestHandlers;

  for (const method of BlixtToolsElectrobunMethods) {
    const rpcMethodName = toBlixtToolsRpcMethodName(method);
    requests[rpcMethodName] = (async (params) => {
      return await blixtToolsImplementation[method](...params);
    }) as BlixtToolsRpcRequestHandlers[typeof rpcMethodName];
  }

  return requests;
};

export const createBlixtToolsElectrobunHandlers = (): AdditionalElectrobunHandlers<any> => {
  return {
    requests: {
      ...createBlixtToolsRpcRequests(),

      // Internal renderer helper used to poll for new log data while keeping the public
      // RPC method names aligned with the TurboModule surface above.
      __BlixtToolsReadLndLogDelta: async ({ offset }: { offset: number }) => {
        return readFileDelta(resolveLndLogPath(), offset);
      },

      __BlixtToolsGetLndLogCursor: async () => {
        return getLndLogCursor();
      },
    },
  };
};

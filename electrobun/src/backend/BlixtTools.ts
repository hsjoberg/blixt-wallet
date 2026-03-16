import { randomBytes } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
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

const resolveLndLogPath = () =>
  path.resolve(BlixtLndPath, "logs", "bitcoin", BlixtChain, "lnd.log");

const resolveSpeedloaderLogPath = () => path.resolve(BlixtCachePath, "log", "speedloader.log");

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

export const createBlixtToolsElectrobunHandlers = (): AdditionalElectrobunHandlers<any> => {
  return {
    requests: {
      __BlixtToolsWriteConfig: async ({ config }: { config: string }) => {
        if (typeof config !== "string") {
          throw new Error("Invalid writeConfig payload.");
        }

        writeFileSync(BlixtLndConfigPath, config, "utf8");

        return normalizeFsPath(BlixtLndConfigPath);
      },

      __BlixtToolsGenerateSecureRandomAsBase64: async ({ length }: { length: number }) => {
        const parsedLength = Number(length);
        if (!Number.isFinite(parsedLength) || parsedLength <= 0) {
          throw new Error("Invalid generateSecureRandomAsBase64 payload.");
        }

        return randomBytes(Math.floor(parsedLength)).toString("base64");
      },

      __BlixtToolsGetFilesDir: async () => {
        return normalizeFsPath(BlixtRootPath);
      },

      __BlixtToolsGetCacheDir: async () => {
        return normalizeFsPath(BlixtCachePath);
      },

      __BlixtToolsGetAppFolderPath: async () => {
        return `${normalizeFsPath(BlixtRootPath)}/`;
      },

      __BlixtToolsTailLog: async ({ numberOfLines }: { numberOfLines: number }) => {
        return tailFile(resolveLndLogPath(), numberOfLines);
      },

      __BlixtToolsObserveLndLogFile: async () => {
        ensureLogParentDirectory(resolveLndLogPath());
        return true;
      },

      __BlixtToolsTailSpeedloaderLog: async ({ numberOfLines }: { numberOfLines: number }) => {
        return tailFile(resolveSpeedloaderLogPath(), numberOfLines);
      },

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

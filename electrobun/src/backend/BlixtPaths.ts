import { existsSync, mkdirSync } from "node:fs";
import os from "node:os";
import path from "node:path";

const flavor = process.env["FLAVOR"]?.trim().toLowerCase() ?? "normal";
export const BlixtChain = process.env["CHAIN"]?.trim().toLowerCase() ?? "mainnet";
const BlixtAppDirectoryName = "blixt-wallet";

const appDirectorySuffix = [
  flavor !== "normal" ? flavor : null,
  BlixtChain !== "mainnet" ? BlixtChain : null,
]
  .filter((segment): segment is string => segment !== null)
  .join("-");

const resolvedAppDirectoryName =
  appDirectorySuffix.length > 0
    ? `${BlixtAppDirectoryName}-${appDirectorySuffix}`
    : BlixtAppDirectoryName;

const resolveAbsoluteEnvPath = (envValue: string | undefined) => {
  const trimmed = envValue?.trim();
  return trimmed && path.isAbsolute(trimmed) ? trimmed : null;
};

const resolveNativeDataBasePath = () => {
  switch (process.platform) {
    case "win32":
      return (
        resolveAbsoluteEnvPath(process.env["APPDATA"]) ??
        path.resolve(os.homedir(), "AppData", "Roaming")
      );
    case "darwin":
      return path.resolve(os.homedir(), "Library", "Application Support");
    default:
      return (
        resolveAbsoluteEnvPath(process.env["XDG_DATA_HOME"]) ??
        path.resolve(os.homedir(), ".local", "share")
      );
  }
};

const resolveNativeCacheBasePath = () => {
  switch (process.platform) {
    case "win32":
      return (
        resolveAbsoluteEnvPath(process.env["LOCALAPPDATA"]) ??
        path.resolve(os.homedir(), "AppData", "Local")
      );
    case "darwin":
      return path.resolve(os.homedir(), "Library", "Caches");
    default:
      return (
        resolveAbsoluteEnvPath(process.env["XDG_CACHE_HOME"]) ??
        path.resolve(os.homedir(), ".cache")
      );
  }
};

export const BlixtRootPath = path.resolve(resolveNativeDataBasePath(), resolvedAppDirectoryName);
export const BlixtLndPath = path.resolve(BlixtRootPath, "lnd");
export const BlixtLndConfigPath = path.resolve(BlixtLndPath, "lnd.conf");
export const BlixtCachePath = path.resolve(resolveNativeCacheBasePath(), resolvedAppDirectoryName);
export const BlixtSqlitePath = path.resolve(BlixtRootPath, "sqlite.db");
export const BlixtKvPath = path.resolve(BlixtRootPath, "kv.json");
export const BlixtKeystorePath = path.resolve(BlixtRootPath, "keystore.json");
export const BlixtWindowsKeystorePath = path.resolve(BlixtRootPath, "keystore.dpapi");

export const normalizeFsPath = (targetPath: string) => targetPath.replaceAll("\\", "/");

export const ensureDirectory = (targetPath: string) => {
  if (!existsSync(targetPath)) {
    mkdirSync(targetPath, { recursive: true });
  }
};

export const ensureBlixtPaths = () => {
  ensureDirectory(BlixtRootPath);
  ensureDirectory(BlixtLndPath);
  ensureDirectory(BlixtCachePath);
};

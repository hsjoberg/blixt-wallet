import { existsSync, mkdirSync } from "node:fs";
import os from "node:os";
import path from "node:path";

export const BlixtRootPath = path.resolve(os.homedir(), ".blixt");
export const BlixtLndPath = path.resolve(BlixtRootPath, "lnd");
export const BlixtLndConfigPath = path.resolve(BlixtLndPath, "lnd.conf");
export const BlixtCachePath = path.resolve(BlixtRootPath, "cache");
export const BlixtSqlitePath = path.resolve(BlixtRootPath, "sqlite.db");
export const BlixtKvPath = path.resolve(BlixtRootPath, "kv.json");
export const BlixtKeystorePath = path.resolve(BlixtRootPath, "keystore.json");
export const BlixtWindowsKeystorePath = path.resolve(BlixtRootPath, "keystore.dpapi");
export const BlixtChain = process.env.CHAIN?.trim().toLowerCase() ?? "mainnet";

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

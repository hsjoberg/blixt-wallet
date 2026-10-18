import type { BuildChain, Spec } from "./NativeBlixtTools";

const chain = ((globalThis as Record<string, unknown>).CHAIN ?? "mainnet") as BuildChain;
const debug = Boolean((globalThis as Record<string, unknown>).DEBUG ?? false);
const flavor = String((globalThis as Record<string, unknown>).FLAVOR ?? "fakelnd");
const applicationId = String(
  (globalThis as Record<string, unknown>).APPLICATION_ID ?? "com.blixtwallet.web",
);
const versionName = String((globalThis as Record<string, unknown>).VERSION_NAME ?? "0.9.0-web");
const versionCode = Number((globalThis as Record<string, unknown>).VERSION_CODE ?? 0);
const buildType = String((globalThis as Record<string, unknown>).BUILD_TYPE ?? "debug");

const emptyLndLogEmitter = ((_: (payload: string) => void) => ({
  remove() {},
})) as Spec["onLndLog"];

const OPFS_ROOT_PATH = "/";
const OPFS_CACHE_DIR = "/cache";
const OPFS_LND_DIR = "/lnd";
const OPFS_LND_CONFIG_PATH = `${OPFS_LND_DIR}/lnd.conf`;
const OPFS_LOGS_DIR = "/logs";
const OPFS_APP_LOG_PATH = `${OPFS_LOGS_DIR}/app.log`;
const MAX_APP_LOG_LINES = 2000;

const appLogs: string[] = [];

type NavigatorStorageWithDirectory = StorageManager & {
  getDirectory?: () => Promise<FileSystemDirectoryHandle>;
};

const normalizePath = (targetPath: string) => {
  if (!targetPath || targetPath === ".") {
    return OPFS_ROOT_PATH;
  }

  let normalized = targetPath.replace(/\\/g, "/").replace(/\/+/g, "/");
  if (!normalized.startsWith("/")) {
    normalized = `/${normalized}`;
  }
  if (normalized.length > 1 && normalized.endsWith("/")) {
    normalized = normalized.slice(0, -1);
  }

  return normalized;
};

const splitPathSegments = (targetPath: string) => {
  return normalizePath(targetPath).split("/").filter(Boolean);
};

const getOpfsRootDirectory = async () => {
  const storage = navigator.storage as NavigatorStorageWithDirectory | undefined;
  if (!storage || typeof storage.getDirectory !== "function") {
    throw new Error("OPFS is not available in this browser session");
  }

  return await storage.getDirectory();
};

const getDirectoryHandle = async (targetPath: string, create = false) => {
  let current = await getOpfsRootDirectory();
  for (const segment of splitPathSegments(targetPath)) {
    current = await current.getDirectoryHandle(segment, { create });
  }

  return current;
};

const ensureDirectory = async (targetPath: string) => {
  await getDirectoryHandle(targetPath, true);
  return normalizePath(targetPath);
};

const writeTextFile = async (targetPath: string, contents: string) => {
  const segments = splitPathSegments(targetPath);
  const fileName = segments.pop();
  if (!fileName) {
    throw new Error(`Invalid file path: ${targetPath}`);
  }

  const parentPath = segments.length === 0 ? OPFS_ROOT_PATH : `/${segments.join("/")}`;
  const parent = await getDirectoryHandle(parentPath, true);
  const fileHandle = await parent.getFileHandle(fileName, { create: true });
  const writable = await fileHandle.createWritable();
  try {
    await writable.write(contents);
  } finally {
    await writable.close();
  }
};

const clearRootDirectory = async () => {
  const root = await getOpfsRootDirectory();
  for await (const [name] of root.entries()) {
    await root.removeEntry(name, { recursive: true });
  }
};

const removePath = async (targetPath: string) => {
  const normalized = normalizePath(targetPath);
  if (normalized === OPFS_ROOT_PATH) {
    await clearRootDirectory();
    return true;
  }

  const segments = splitPathSegments(normalized);
  const entryName = segments.pop();
  if (!entryName) {
    return true;
  }

  const parentPath = segments.length === 0 ? OPFS_ROOT_PATH : `/${segments.join("/")}`;

  try {
    const parent = await getDirectoryHandle(parentPath, false);
    await parent.removeEntry(entryName, { recursive: true });
    return true;
  } catch (error: any) {
    if (error?.name === "NotFoundError") {
      return false;
    }
    throw error;
  }
};

const collectFiles = async (
  directory: FileSystemDirectoryHandle,
  currentPath = OPFS_ROOT_PATH,
): Promise<Record<string, number>> => {
  const files: Record<string, number> = {};

  for await (const [name, handle] of directory.entries()) {
    const entryPath = currentPath === OPFS_ROOT_PATH ? `/${name}` : `${currentPath}/${name}`;
    if (handle.kind === "directory") {
      Object.assign(files, await collectFiles(handle, entryPath));
      continue;
    }

    const file = await handle.getFile();
    files[entryPath] = file.size;
  }

  return files;
};

const removeMatchingFiles = async (
  directoryPath: string,
  predicate: (fileName: string) => boolean,
) => {
  try {
    const directory = await getDirectoryHandle(directoryPath, false);
    for await (const [name, handle] of directory.entries()) {
      if (handle.kind === "file" && predicate(name)) {
        await directory.removeEntry(name);
      }
    }
  } catch (error: any) {
    if (error?.name !== "NotFoundError") {
      throw error;
    }
  }
};

const toBase64 = (data: Uint8Array) => {
  let binary = "";
  for (const value of data) {
    binary += String.fromCharCode(value);
  }
  return btoa(binary);
};

const formatLogLine = (level: "v" | "d" | "i" | "w" | "e", tag: string, message: string) => {
  return `${new Date().toISOString()} ${level.toUpperCase()} ${tag}: ${message}`;
};

const appendAppLog = (line: string) => {
  appLogs.push(line);
  if (appLogs.length > MAX_APP_LOG_LINES) {
    appLogs.splice(0, appLogs.length - MAX_APP_LOG_LINES);
  }
};

const consoleMethodByLevel: Record<"v" | "d" | "i" | "w" | "e", keyof Console> = {
  v: "debug",
  d: "debug",
  i: "info",
  w: "warn",
  e: "error",
};

const unsupportedOperation = async (message: string): Promise<never> => {
  throw new Error(message);
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
    await ensureDirectory(OPFS_LND_DIR);
    await writeTextFile(OPFS_LND_CONFIG_PATH, config);
    return OPFS_LND_CONFIG_PATH;
  },
  generateSecureRandomAsBase64: async (length) => {
    const data = new Uint8Array(length);
    crypto.getRandomValues(data);
    return toBase64(data);
  },
  log: (level, tag, message) => {
    const line = formatLogLine(level, tag, message);
    appendAppLog(line);

    const consoleMethod = consoleMethodByLevel[level];
    const consoleTarget = console[consoleMethod];
    if (typeof consoleTarget === "function") {
      consoleTarget.call(console, line);
    }
  },
  saveLogs: async () => {
    await ensureDirectory(OPFS_LOGS_DIR);
    await writeTextFile(OPFS_APP_LOG_PATH, appLogs.join("\n"));
    return OPFS_APP_LOG_PATH;
  },
  copyLndLog: async () => {
    return await unsupportedOperation("LND log export is not supported on plain web yet");
  },
  copySpeedloaderLog: async () => {
    return await unsupportedOperation("Speedloader log export is not supported on plain web yet");
  },
  tailLog: async (_numberOfLines) => {
    return await unsupportedOperation("LND log viewing is not supported on plain web yet");
  },
  observeLndLogFile: async () => {
    return await unsupportedOperation("LND log streaming is not supported on plain web yet");
  },
  tailSpeedloaderLog: async (_numberOfLines) => {
    return await unsupportedOperation("Speedloader log viewing is not supported on plain web yet");
  },
  saveChannelsBackup: async () => {
    return await unsupportedOperation("SCB export is not supported on plain web yet");
  },
  saveChannelBackupFile: async () => {
    return await unsupportedOperation("SCB file export is not supported on plain web yet");
  },
  getTorEnabled: async () => false,
  DEBUG_deleteSpeedloaderLastrunFile: async () => {
    await removeMatchingFiles(OPFS_CACHE_DIR, (fileName) => fileName.includes("lastrun"));
    return true;
  },
  DEBUG_deleteSpeedloaderDgraphDirectory: async () => {
    await ensureDirectory(OPFS_CACHE_DIR);
    await removePath(`${OPFS_CACHE_DIR}/dgraph`);
    await removeMatchingFiles(OPFS_CACHE_DIR, (fileName) =>
      fileName.toLowerCase().includes("dgraph"),
    );
    return true;
  },
  DEBUG_deleteNeutrinoFiles: async () => {
    const chainPath = `${OPFS_LND_DIR}/data/chain/bitcoin/${chain}`;
    await removeMatchingFiles(chainPath, (fileName) => {
      const lower = fileName.toLowerCase();
      return lower.includes("neutrino") || lower.includes("filter") || lower.includes("header");
    });
    return true;
  },
  getInternalFiles: async () => {
    const root = await getOpfsRootDirectory();
    return await collectFiles(root);
  },
  getCacheDir: async () => {
    await ensureDirectory(OPFS_CACHE_DIR);
    return `${OPFS_CACHE_DIR}/`;
  },
  getFilesDir: async () => OPFS_ROOT_PATH,
  getAppFolderPath: async () => OPFS_ROOT_PATH,
  saveChannelDbFile: async () => {
    return await unsupportedOperation("channel.db export is not supported on plain web yet");
  },
  importChannelDbFile: async (_channelDbPath) => {
    return await unsupportedOperation("channel.db import is not supported on plain web yet");
  },
  getIntentStringData: async () => null,
  getIntentNfcData: async () => null,
  DEBUG_deleteWallet: async () => {
    await removePath(OPFS_LND_DIR);
    return true;
  },
  DEBUG_deleteDatafolder: async () => {
    await clearRootDirectory();
    return true;
  },
  restartApp: () => {
    location.reload();
  },
  checkICloudEnabled: async () => false,
  checkApplicationSupportExists: async () => true,
  createIOSApplicationSupportAndLndDirectories: async () => {
    await ensureDirectory(OPFS_LND_DIR);
    await ensureDirectory(OPFS_CACHE_DIR);
    return true;
  },
  excludeLndICloudBackup: async () => true,
  macosOpenFileDialog: async () => null,
  onLndLog: emptyLndLogEmitter,
};

export default NativeBlixtToolsWeb;

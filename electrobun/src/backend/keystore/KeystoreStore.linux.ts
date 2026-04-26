import { spawnSync, type SpawnSyncReturns } from "node:child_process";
import { existsSync } from "node:fs";
import { backendLog } from "../BackendLog";
import type { KeystoreStore } from "./KeystoreStore";
import { normalizeStore } from "./shared";

const SECRET_SERVICE_PATH = "secret-service://blixt-wallet/electrobun-keystore";
const SECRET_LABEL = "Blixt Wallet Electrobun Keystore";
const SECRET_ATTRIBUTES = ["app", "blixt-wallet", "component", "electrobun-keystore"] as const;

type LinuxKeystoreBackend = "secret-service" | "file";

const lookupArgs = () => ["lookup", ...SECRET_ATTRIBUTES];
const clearArgs = () => ["clear", ...SECRET_ATTRIBUTES];
const storeArgs = () => ["store", "--label", SECRET_LABEL, ...SECRET_ATTRIBUTES];

const runSecretTool = (
  args: string[],
  input?: string,
): SpawnSyncReturns<string> | NodeJS.ErrnoException => {
  const result = spawnSync("secret-tool", args, {
    encoding: "utf8",
    input,
  });

  return result.error ?? result;
};

const isErrnoException = (
  result: SpawnSyncReturns<string> | NodeJS.ErrnoException,
): result is NodeJS.ErrnoException => {
  return "code" in result && !("status" in result);
};

const hasSessionBus = () => {
  return process.env["DBUS_SESSION_BUS_ADDRESS"]?.trim().length;
};

const secretServiceUnavailable = (result: SpawnSyncReturns<string> | NodeJS.ErrnoException) => {
  if (isErrnoException(result)) {
    return result.code === "ENOENT";
  }

  if (result.status === 0) {
    return false;
  }

  const stderr = result.stderr.trim().toLowerCase();
  return (
    stderr.includes("cannot autolaunch d-bus") ||
    stderr.includes("could not connect") ||
    stderr.includes("no such secret collection") ||
    stderr.includes("no secret service") ||
    stderr.includes("service unknown") ||
    stderr.includes("name has no owner") ||
    stderr.includes("not provided by any .service files") ||
    stderr.includes("cannot connect")
  );
};

const secretMissing = (result: SpawnSyncReturns<string>) => {
  return result.status === 1 && result.stderr.trim() === "";
};

export const createLinuxKeystoreStore = (fileStore: KeystoreStore): KeystoreStore => {
  let backend: LinuxKeystoreBackend | null = null;
  let warnedFallback = false;
  let loggedSecretService = false;

  const fallbackToFile = (reason: string) => {
    backend = "file";
    if (!warnedFallback) {
      warnedFallback = true;
      backendLog("info", `Linux keystore: falling back to file store (${reason}).`);
    }
  };

  const useSecretService = () => {
    backend = "secret-service";
    if (!loggedSecretService) {
      loggedSecretService = true;
      backendLog("info", "Linux keystore: using Secret Service.");
    }
    return backend;
  };

  const ensureBackend = () => {
    if (backend !== null) {
      return backend;
    }

    if (existsSync(fileStore.path)) {
      fallbackToFile(`existing keystore file found at ${fileStore.path}`);
      return backend;
    }

    if (!hasSessionBus()) {
      fallbackToFile("DBUS_SESSION_BUS_ADDRESS is not set");
      return backend;
    }

    const probe = runSecretTool(lookupArgs());
    if (isErrnoException(probe)) {
      fallbackToFile("secret-tool is not installed");
      return backend;
    }

    if (probe.status === 0 || secretMissing(probe)) {
      return useSecretService();
    }

    if (secretServiceUnavailable(probe)) {
      fallbackToFile(probe.stderr.trim() || "Secret Service is unavailable");
      return backend;
    }

    return useSecretService();
  };

  const loadFromSecretService = (): Record<string, string> => {
    const result = runSecretTool(lookupArgs());
    if (isErrnoException(result) || secretServiceUnavailable(result)) {
      fallbackToFile(isErrnoException(result) ? result.message : result.stderr.trim());
      return fileStore.load();
    }

    if (secretMissing(result)) {
      return {};
    }

    if (result.status !== 0) {
      throw new Error(result.stderr.trim() || result.stdout.trim() || "secret-tool lookup failed.");
    }

    try {
      const parsed = JSON.parse(result.stdout.replace(/\r?\n$/, ""));
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
        throw new Error("Secret Service keystore payload must be a JSON object.");
      }

      return normalizeStore(parsed as Record<string, unknown>);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to parse Secret Service keystore payload: ${message}`);
    }
  };

  const persistToSecretService = (nextStore: Record<string, string>) => {
    const clearResult = runSecretTool(clearArgs());
    if (
      isErrnoException(clearResult) ||
      secretServiceUnavailable(clearResult) ||
      (clearResult.status !== 0 && !secretMissing(clearResult))
    ) {
      fallbackToFile(
        isErrnoException(clearResult)
          ? clearResult.message
          : clearResult.stderr.trim() || "secret-tool clear failed",
      );
      fileStore.persist(nextStore);
      return;
    }

    const storeResult = runSecretTool(storeArgs(), JSON.stringify(nextStore));
    if (
      isErrnoException(storeResult) ||
      secretServiceUnavailable(storeResult) ||
      storeResult.status !== 0
    ) {
      fallbackToFile(
        isErrnoException(storeResult)
          ? storeResult.message
          : storeResult.stderr.trim() || "secret-tool store failed",
      );
      fileStore.persist(nextStore);
      return;
    }
  };

  return {
    get path() {
      return ensureBackend() === "secret-service" ? SECRET_SERVICE_PATH : fileStore.path;
    },

    load() {
      return ensureBackend() === "secret-service" ? loadFromSecretService() : fileStore.load();
    },

    persist(nextStore) {
      if (ensureBackend() === "secret-service") {
        persistToSecretService(nextStore);
        return;
      }

      fileStore.persist(nextStore);
    },
  };
};

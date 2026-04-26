export type BackendLogLevel = "debug" | "info" | "warn" | "error";

export type BackendLogEntry = {
  level: BackendLogLevel;
  message: string;
};

type BackendLogListener = (entry: BackendLogEntry) => void;

const listeners = new Set<BackendLogListener>();

export const registerBackendLogListener = (listener: BackendLogListener) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

export const backendLog = (level: BackendLogLevel, message: string) => {
  const consoleMethod =
    level === "debug"
      ? console.log
      : level === "info"
        ? console.log
        : level === "warn"
          ? console.warn
          : console.error;

  consoleMethod(`[backend:${level}] ${message}`);

  const entry: BackendLogEntry = {
    level,
    message,
  };
  for (const listener of listeners) {
    listener(entry);
  }
};

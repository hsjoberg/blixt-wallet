import { readFileSync, writeFileSync } from "node:fs";
import { BlixtKeystorePath } from "../BlixtPaths";
import type { KeystoreStore } from "./KeystoreStore";
import { normalizeStore } from "./shared";

export const createFileKeystoreStore = (): KeystoreStore => {
  return {
    path: BlixtKeystorePath,

    load() {
      try {
        const parsed = JSON.parse(readFileSync(BlixtKeystorePath, "utf8"));
        if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
          return normalizeStore(parsed as Record<string, unknown>);
        }
      } catch (_error) {}

      return {};
    },

    persist(nextStore) {
      writeFileSync(BlixtKeystorePath, JSON.stringify(nextStore), "utf8");
    },
  };
};

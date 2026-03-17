import { readFileSync, writeFileSync } from "node:fs";
import { BlixtKeystorePath } from "../BlixtPaths";
import type { KeystoreStore } from "./KeystoreStore";
import { normalizeStore } from "./shared";

export const createFileKeystoreStore = (): KeystoreStore => {
  let cache: Record<string, string> | null = null;

  return {
    path: BlixtKeystorePath,

    load() {
      if (cache !== null) {
        return cache;
      }

      try {
        const parsed = JSON.parse(readFileSync(BlixtKeystorePath, "utf8"));
        if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
          cache = normalizeStore(parsed as Record<string, unknown>);
          return cache;
        }
      } catch (_error) {}

      cache = {};
      return cache;
    },

    persist(nextStore) {
      cache = nextStore;
      writeFileSync(BlixtKeystorePath, JSON.stringify(nextStore), "utf8");
    },
  };
};

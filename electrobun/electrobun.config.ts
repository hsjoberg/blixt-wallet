import type { ElectrobunConfig } from "electrobun";

const NAPI_ADDON_FILENAME = "turbolnd_electrobun_napi.node";

function getLndLibraryFilename(): string {
  switch (process.platform) {
    case "win32":
      return "liblnd.dll";
    case "linux":
      return "liblnd.so";
    case "darwin":
      return "liblnd.dylib";
    default:
      throw new Error(`Unsupported platform for liblnd packaging: ${process.platform}`);
  }
}

const LND_LIBRARY_FILENAME = getLndLibraryFilename();

export default {
  app: {
    name: "blixt-wallet",
    identifier: "com.blixtwallet.electrobun",
    version: "0.9.0",
  },
  build: {
    views: {
      mainview: {
        entrypoint: "src/mainview/index.ts",
      },
    },
    copy: {
      "src/mainview/dist": "views/mainview/dist",
      [`vendor/${LND_LIBRARY_FILENAME}`]: LND_LIBRARY_FILENAME,
      [`vendor/${NAPI_ADDON_FILENAME}`]: `bun/${NAPI_ADDON_FILENAME}`,
    },
    watch: ["../src", "../web", "../assets", "../locales"],
    watchIgnore: ["src/mainview/dist/**", "build/**", "artifacts/**"],
    mac: {
      bundleCEF: false,
    },
    linux: {
      bundleCEF: false,
    },
    win: {
      bundleCEF: false,
    },
  },
} satisfies ElectrobunConfig;

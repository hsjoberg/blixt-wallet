import type { ElectrobunConfig } from "electrobun";

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
      "vendor/liblnd.dll": "liblnd.dll",
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

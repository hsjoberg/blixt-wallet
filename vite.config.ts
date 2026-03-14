import path from "path";
import { transformAsync } from "@babel/core";
import { defineConfig, loadEnv, type UserConfig } from "vite";
import react from "@vitejs/plugin-react";
import { viteStaticCopy } from "vite-plugin-static-copy";
import { nodePolyfills } from "vite-plugin-node-polyfills";

const projectRoot = __dirname;
const resolvePath = (...segments: string[]) => path.resolve(projectRoot, ...segments);
const normalizePath = (filePath: string) => filePath.replaceAll("\\", "/");
const parseEnvBoolean = (value: string | undefined, fallback: boolean) => {
  if (value == null) {
    return fallback;
  }

  const normalized = value.trim().toLowerCase();
  if (["1", "true", "yes", "on"].includes(normalized)) {
    return true;
  }
  if (["0", "false", "no", "off"].includes(normalized)) {
    return false;
  }

  return fallback;
};

const transpileDependencyPatterns = [
  /node_modules\/react-native-web\/src\//,
  /node_modules\/react-native-easy-grid\/Components\//,
  /node_modules\/react-native-animatable\//,
  /node_modules\/react-native-drawer\//,
  /node_modules\/react-native-qrcode-svg\//,
  /node_modules\/@codler\/react-native-keyboard-aware-scroll-view\//,
];

const shouldTranspileDependency = (id: string) =>
  transpileDependencyPatterns.some((pattern) => pattern.test(id));

const isEasyGridComponent = (id: string) =>
  /node_modules\/react-native-easy-grid\/Components\//.test(id);

const isAnimatableModule = (id: string) => /node_modules\/react-native-animatable\//.test(id);

const isReactNativeDrawerModule = (id: string) => /node_modules\/react-native-drawer\//.test(id);

const isReactNativeQrCodeSvgModule = (id: string) =>
  /node_modules\/react-native-qrcode-svg\//.test(id);

const isReactNativeElementDropdownModule = (id: string) =>
  /node_modules\/react-native-element-dropdown\/lib\/module\/.*\.js$/.test(id);

const isReactNativeWebWebViewIndexModule = (id: string) =>
  /node_modules\/react-native-web-webview\/(?:dist|src)\/index\.js$/.test(id);

const REACT_NATIVE_WEB_WEBVIEW_POSTMOCK_VIRTUAL_ID = "\0react-native-web-webview-postmock-html";

export default defineConfig(({ command, mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const isProduction = mode === "production";
  const isAppDev = parseEnvBoolean(env.BLIXT_DEV ?? env.VITE_BLIXT_DEV, !isProduction);
  const disableHmrForProductionNodeEnv =
    command === "serve" && process.env.NODE_ENV === "production";
  const flavor = (env.FLAVOR ?? env.VITE_FLAVOR ?? "fakelnd").toLowerCase();
  const isElectrobunTarget = (env.VITE_IS_ELECTROBUN ?? "false").toLowerCase() === "true";
  const turboLndModuleReplacement =
    flavor === "normal"
      ? isElectrobunTarget
        ? resolvePath("electrobun/src/mainview/shims/react-native-turbo-lnd-view.ts")
        : "react-native-turbo-lnd/electrobun/view"
      : "react-native-turbo-lnd/mock";
  const turboSqliteModuleReplacement = isElectrobunTarget
    ? resolvePath("electrobun/src/mainview/shims/react-native-turbo-sqlite.ts")
    : "react-native-turbo-sqlite/mocks";

  return {
    root: resolvePath("web"),

    plugins: [
      {
        name: "react-native-web-webview-postmock-resolver",
        enforce: "pre",
        resolveId(source, importer) {
          if (!importer) {
            return null;
          }

          const cleanImporter = normalizePath(importer.split("?")[0]);
          if (source === "./postMock.html" && isReactNativeWebWebViewIndexModule(cleanImporter)) {
            return REACT_NATIVE_WEB_WEBVIEW_POSTMOCK_VIRTUAL_ID;
          }

          return null;
        },
        load(id) {
          if (id === REACT_NATIVE_WEB_WEBVIEW_POSTMOCK_VIRTUAL_ID) {
            return "export default '/postMock.html';";
          }
          return null;
        },
      },

      {
        name: "react-native-deps-babel",
        enforce: "pre",
        async transform(code, id) {
          const cleanId = normalizePath(id.split("?")[0]);
          if (!cleanId.endsWith(".js")) {
            return null;
          }
          if (!cleanId.includes("/node_modules/")) {
            return null;
          }

          if (isReactNativeElementDropdownModule(cleanId)) {
            const patchedCode = code.replace(
              /const\s+([A-Za-z_$][\w$]*)\s*=\s*require\((['"])([^'"]+\.(?:png|jpe?g|gif|webp|svg))\2\);/g,
              "import $1 from '$3';",
            );

            if (patchedCode !== code) {
              return {
                code: patchedCode,
                map: null,
              };
            }
          }

          if (!shouldTranspileDependency(cleanId)) {
            if (!isReactNativeWebWebViewIndexModule(cleanId)) {
              return null;
            }
          }

          if (isReactNativeWebWebViewIndexModule(cleanId)) {
            const patchedCode = code.replace(
              /require\((['"])\\.\/postMock\.html\1\)/g,
              '"/postMock.html"',
            );
            return {
              code: patchedCode,
              map: null,
            };
          }

          const presets =
            isEasyGridComponent(cleanId) ||
            isAnimatableModule(cleanId) ||
            isReactNativeDrawerModule(cleanId) ||
            isReactNativeQrCodeSvgModule(cleanId)
              ? ["@babel/preset-react"]
              : [["module:@react-native/babel-preset", { disableImportExportTransform: true }]];

          const result = await transformAsync(code, {
            filename: cleanId,
            babelrc: false,
            configFile: false,
            presets,
            sourceMaps: true,
          });

          if (!result?.code) {
            return null;
          }

          return {
            code: result.code,
            map: result.map ?? null,
          };
        },
      },

      react({
        babel: {
          babelrc: false,
          configFile: false,
        },
      }),

      nodePolyfills({
        protocolImports: true,
      }),

      viteStaticCopy({
        targets: [
          {
            src: normalizePath(resolvePath("node_modules/sql.js/dist/sql-wasm.wasm")),
            dest: ".",
          },
          {
            src: normalizePath(resolvePath("node_modules/sql.js/dist/sql-wasm-browser.wasm")),
            dest: ".",
          },
          {
            src: normalizePath(resolvePath("assets/fonts/*")),
            dest: ".",
          },
          {
            src: normalizePath(resolvePath("node_modules/react-native-vector-icons/Fonts/*")),
            dest: ".",
          },
          {
            src: normalizePath(
              resolvePath("node_modules/react-native-web-webview/dist/postMock.html"),
            ),
            dest: ".",
          },
        ],
      }),
    ],

    // Electrobun/web renderer module wiring lives in two places:
    // 1. The aliases below are the explicit package-level shims. This is where native packages are
    //    swapped for browser or Electrobun-safe implementations under `web/web-hacks/**` or
    //    `electrobun/src/mainview/shims/**`.
    // 2. Local imports keep using platform file resolution because `.web.*` comes first in
    //    `extensions`. That means imports like `../storage/keystore` resolve to
    //    `src/storage/keystore.web.ts` in the renderer, so the `react-native-keychain` import in
    //    `src/storage/keystore.ts` never reaches the web/Electrobun bundle. The same pattern is
    //    used for files like `src/storage/database/sqlite.web.ts` and
    //    `src/turbomodules/NativeBlixtTools.web.ts`.
    // For Electrobun specifically, `isElectrobunTarget` enables the RPC-backed renderer shims for
    // `react-native-turbo-lnd`, `react-native-turbo-sqlite`, and
    // `@react-native-async-storage/async-storage`. If a native dependency leaks into the renderer,
    // decide first whether it should be handled here with an alias or by adding a colocated
    // `.web.*` implementation.
    resolve: {
      extensions: [
        ".web.tsx",
        ".web.ts",
        ".tsx",
        ".ts",
        ".web.jsx",
        ".web.js",
        ".jsx",
        ".js",
        ".json",
      ],
      alias: [
        {
          find: /^react-native$/,
          replacement: resolvePath("web/web-hacks/react-native-web-compat.js"),
        },
        {
          find: /^sql\.js$/,
          replacement: resolvePath("node_modules/sql.js/dist/sql-wasm.js"),
        },
        {
          find: /^react-native\/Libraries\/Utilities\/codegenNativeComponent$/,
          replacement: resolvePath(
            "web/web-hacks/react-native-libraries/codegenNativeComponent.js",
          ),
        },
        {
          find: /^react-native\/Libraries\/Utilities\/codegenNativeCommands$/,
          replacement: resolvePath("web/web-hacks/react-native-libraries/codegenNativeCommands.js"),
        },
        {
          find: /^react-native\/Libraries\/Image\/resolveAssetSource$/,
          replacement: resolvePath("web/web-hacks/react-native-libraries/resolveAssetSource.js"),
        },
        {
          find: /^react-native\/Libraries\/StyleSheet\/processColor$/,
          replacement: resolvePath("web/web-hacks/react-native-libraries/processColor.js"),
        },
        {
          find: /^react-native\/Libraries\/StyleSheet\/processColorArray$/,
          replacement: resolvePath("web/web-hacks/react-native-libraries/processColorArray.js"),
        },
        {
          find: /^react-native\/Libraries\/NativeComponent\/NativeComponentRegistry$/,
          replacement: resolvePath(
            "web/web-hacks/react-native-libraries/NativeComponentRegistry.js",
          ),
        },
        {
          find: /^react-native\/Libraries\/NativeComponent\/ViewConfigIgnore$/,
          replacement: resolvePath("web/web-hacks/react-native-libraries/ViewConfigIgnore.js"),
        },
        {
          find: /^react-native\/Libraries\/ReactNative\/AppContainer$/,
          replacement: resolvePath("web/web-hacks/react-native-libraries/AppContainer.js"),
        },
        {
          find: /^react-native\/Libraries\/ReactNative\/RendererProxy$/,
          replacement: resolvePath("web/web-hacks/react-native-libraries/RendererProxy.js"),
        },
        {
          find: "react-native-linear-gradient",
          replacement: "react-native-web-linear-gradient",
        },
        {
          find: /^react-native-vector-icons$/,
          replacement: resolvePath("node_modules/react-native-vector-icons/dist/index.js"),
        },
        {
          find: /^react-native-vector-icons\/(.+)$/,
          replacement: resolvePath("node_modules/react-native-vector-icons/dist/$1.js"),
        },
        {
          find: /^react-native-element-dropdown$/,
          replacement: resolvePath("web/web-hacks/react-native-element-dropdown.js"),
        },
        {
          find: /^native-base-shoutem-theme$/,
          replacement: resolvePath("node_modules/native-base-shoutem-theme/dist/index.js"),
        },
        {
          find: /^@react-native-picker\/picker$/,
          replacement: resolvePath("web/web-hacks/react-native-picker.js"),
        },
        {
          find: /^@react-native-documents\/picker$/,
          replacement: resolvePath("web/web-hacks/react-native-documents-picker.js"),
        },
        {
          find: "react-native-maps",
          replacement: resolvePath("web/web-hacks/react-native-maps.jsx"),
        },
        {
          find: "react-native-svg",
          replacement: "react-native-svg-web",
        },
        {
          find: "react-native-webview",
          replacement: "react-native-web-webview",
        },
        {
          find: /^react-native-keyboard-controller$/,
          replacement: resolvePath("web/web-hacks/react-native-keyboard-controller.js"),
        },
        {
          find: /^react-native-turbo-lnd$/,
          replacement: turboLndModuleReplacement,
        },
        {
          find: "react-native-permissions",
          replacement: resolvePath("web/web-hacks/react-native-permission.js"),
        },
        {
          find: "react-native-dialogs",
          replacement: resolvePath("web/web-hacks/react-native-dialogs.js"),
        },
        {
          find: "react-native-fs",
          replacement: resolvePath("web/web-hacks/react-native-fs.js"),
        },
        {
          find: "react-native-icloudstore",
          replacement: resolvePath("web/web-hacks/react-native-icloudstore.js"),
        },
        {
          find: "react-native-nitro-tor",
          replacement: resolvePath("web/web-hacks/react-native-nitro-tor.js"),
        },
        {
          find: /^react-native-turbo-sqlite$/,
          replacement: turboSqliteModuleReplacement,
        },
        ...(isElectrobunTarget
          ? [
              {
                find: /^@react-native-async-storage\/async-storage$/,
                replacement: resolvePath("electrobun/src/mainview/shims/async-storage.js"),
              },
            ]
          : []),
        {
          find: "@notifee/react-native",
          replacement: resolvePath("web/web-hacks/notifee-react-native.js"),
        },
      ],
    },

    define: {
      global: "globalThis",
      __DEV__: JSON.stringify(isAppDev),
      "process.env.NODE_ENV": JSON.stringify(isProduction ? "production" : "development"),
      "process.env.JEST_WORKER_ID": "null",
      "process.env.ELECTROBUN_SAFE_STARTUP": JSON.stringify(
        env.ELECTROBUN_SAFE_STARTUP ?? env.VITE_ELECTROBUN_SAFE_STARTUP ?? "",
      ),
    },

    optimizeDeps: {
      entries: ["index.html"],
      include: ["prop-types", "react-native-drawer", "qrcode"],
      exclude: [
        "react-native-easy-grid",
        "react-native-animatable",
        "react-native-qrcode-svg",
        "@codler/react-native-keyboard-aware-scroll-view",
        "react-native-web-webview",
      ],
      rolldownOptions: {
        transform: {
          define: {
            global: "globalThis",
          },
        },
        moduleTypes: {
          ".html": "text",
        },
        plugins: [],
      },
    },

    server: {
      port: 8080,
      hmr: disableHmrForProductionNodeEnv ? false : undefined,
      fs: {
        allow: [resolvePath(".")],
      },
    },

    build: {
      outDir: resolvePath("web/dist"),
      emptyOutDir: true,
      sourcemap: true,
      target: "es2020",
      rollupOptions: {
        output: {
          entryFileNames: "assets/[name].js",
          chunkFileNames: "assets/[name].js",
          assetFileNames: "assets/[name][extname]",
        },
      },
    },

    envPrefix: ["VITE_", "CHAIN", "FLAVOR", "APPLICATION_ID", "BLIXT_WEB_DEMO", "BLIXT_DEV"],

    css: {
      devSourcemap: true,
    },
  } satisfies UserConfig;
});

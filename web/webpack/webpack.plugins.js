const path = require("path");
const webpack = require("webpack");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const CopyPlugin = require("copy-webpack-plugin");
const NodePolyfillPlugin = require("node-polyfill-webpack-plugin");

const packageJson = require("../../package.json");

const NOOP = () => {};
const isElectron = process.env.npm_lifecycle_event?.includes("electron");
const webEnvironment = isElectron ? "electron" : "webdemo";
const chain = process.env.CHAIN ?? "mainnet";
const flavor = process.env.FLAVOR;
const applicationId = process.env.APPLICATION_ID;

module.exports = [
  isElectron
    ? NOOP
    : new HtmlWebpackPlugin({
        template: path.join(__dirname, "../index.html"),
      }),

  new webpack.DefinePlugin({
    "process.env.NODE_ENV": JSON.stringify(process.env.NODE_ENV || "development"),
    FLAVOR: JSON.stringify(flavor),
    DEBUG: JSON.stringify(process.env.NODE_ENV !== "production"),
    VERSION_CODE: JSON.stringify(0),
    BUILD_TYPE: JSON.stringify(process.env.NODE_ENV === "production" ? "release" : "debug"),
    APPLICATION_ID: JSON.stringify(applicationId),
    VERSION_NAME: JSON.stringify(packageJson.version + "-" + webEnvironment),
    CHAIN: JSON.stringify(chain),
    __DEV__: JSON.stringify(process.env.NODE_ENV !== "production"),
  }),

  // sql.js:
  new CopyPlugin({
    patterns: [
      {
        context: "./node_modules/sql.js/dist/",
        from: "sql-wasm.wasm",
        to: "./",
      },
      { context: "./assets/fonts/", from: "*", to: "./" },
      {
        context: "./node_modules/react-native-vector-icons/Fonts/",
        from: "*",
        to: "./",
      },
    ],
  }),

  new NodePolyfillPlugin(),

  new webpack.NormalModuleReplacementPlugin(
    /node_modules\/native-base.*utils\/index\.js/,
    path.join(__dirname, "../web-hacks/native-base-utils-hack.js")
  ),

  new webpack.NormalModuleReplacementPlugin(
    /node_modules\/react-native-permissions/,
    path.join(__dirname, "../web-hacks/react-native-permission.js")
  ),

  new webpack.NormalModuleReplacementPlugin(
    /node_modules\/react-native-push-notification/,
    path.join(__dirname, "../web-hacks/react-native-push-notification.js")
  ),

  new webpack.NormalModuleReplacementPlugin(
    /node_modules\/react-native-sqlite-storage/,
    path.join(__dirname, "../web-hacks/react-native-sqlite-storage.js")
  ),

  new webpack.NormalModuleReplacementPlugin(
    /node_modules\/react-native-dialogs/,
    path.join(__dirname, "../web-hacks/react-native-dialogs.js")
  ),

  new webpack.NormalModuleReplacementPlugin(
    /node_modules\/react-native-fs/,
    path.join(__dirname, "../web-hacks/react-native-fs.js")
  ),

  new webpack.NormalModuleReplacementPlugin(
    /node_modules\/@react-native-community\/clipboard/,
    path.join(__dirname, "../web-hacks/@react-native-community/clipboard.js")
  ),

  new webpack.NormalModuleReplacementPlugin(
    /node_modules\/react-native-securerandom/,
    path.join(__dirname, "../web-hacks/react-native-securerandom.js")
  ),

  new webpack.NormalModuleReplacementPlugin(
    /node_modules\/react-native-build-config/,
    path.join(__dirname, "../web-hacks/react-native-build-config.js")
  ),

  new webpack.NormalModuleReplacementPlugin(
    /node_modules\/react-native-icloudstore/,
    path.join(__dirname, "../web-hacks/react-native-icloudstore.js")
  ),
];

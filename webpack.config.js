const path = require('path');
const webpack = require('webpack');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CopyPlugin = require('copy-webpack-plugin');
const NodePolyfillPlugin = require("node-polyfill-webpack-plugin")
const rootDir = path.join(__dirname);
const webpackEnv = process.env.NODE_ENV || 'development';

module.exports = {
  mode: webpackEnv,
  entry: {
    app: path.join(rootDir, './index.web.js'),
  },
  output: {
    path: path.resolve(rootDir, 'dist'),
    filename: 'app-[fullhash].bundle.js',
  },
  devtool: 'source-map',
  module: {
    rules: [
      {
        test: /\.(tsx|ts|jsx|js|mjs)$/,
        include: [
          path.resolve('src'),
          path.resolve('mocks'),

          path.resolve('node_modules/native-base-shoutem-theme'),
          path.resolve('node_modules/react-navigation'),
          path.resolve('node_modules/react-native-easy-grid'),
          path.resolve('node_modules/react-native-drawer'),
          path.resolve('node_modules/react-native-safe-area-view'),
          path.resolve('node_modules/react-native-vector-icons'),
          path.resolve('node_modules/react-native-keyboard-aware-scroll-view'),
          path.resolve('node_modules/react-native-web'),
          path.resolve('node_modules/react-native-tab-view'),
          path.resolve('node_modules/@react-native-community/picker'),
          path.resolve('node_modules/@react-native-picker/picker'),
          path.resolve('node_modules/@codler/react-native-keyboard-aware-scroll-view'),
          path.resolve('node_modules/react-native-gesture-handler'),
          path.resolve('node_modules/react-native-animatable'),
          path.resolve('node_modules/react-native-qrcode-svg'),
          path.resolve('node_modules/react-native-material-menu'),
          path.resolve('node_modules/react-native-linear-gradient'),
          path.resolve('node_modules/react-native-haptic-feedback'),
          path.resolve('node_modules/react-native-fs'),
          path.resolve('node_modules/react-native-document-picker'),
          path.resolve('node_modules/@react-native-community/art'),
          path.resolve('node_modules/react-native-reanimated'),
          path.resolve('node_modules/native-base'),
        ],
        use: ['babel-loader'],
      },
      {
        test: /\.(png|svg|jpg|jpeg|gif)$/i,
        type: 'asset/resource',
      },
      {
        test: /\.(woff|woff2|eot|ttf|otf)$/i,
        type: 'asset/resource',
      },
      {
        test: /\.wasm$/,
        use: ['wasm-loader']
      },
      // For react-native-web-view
      {
        test: /postMock.html$/,
        use: {
          loader: 'file-loader',
          options: {
            name: '[name].[ext]',
          },
        },
      }
    ],
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: path.join(__dirname, "web/index.html"),
    }),
    new webpack.HotModuleReplacementPlugin(),

    new webpack.DefinePlugin({
      'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development'),
      FLAVOR: JSON.stringify("fakelnd"),
      DEBUG: JSON.stringify(process.env.NODE_ENV !== "production"),
      VERSION_CODE: JSON.stringify(1),
      BUILD_TYPE: JSON.stringify(process.env.NODE_ENV === "production" ? "release" : "debug"),
      APPLICATION_ID: JSON.stringify("com.blixtwallet.webdemo"),
      VERSION_NAME: JSON.stringify("webdemo"),
      CHAIN: JSON.stringify("mainnet"),
      __DEV__: JSON.stringify(process.env.NODE_ENV !== "production"),
    }),

    // sql.js:
    new CopyPlugin({
      patterns: [
        { context: './node_modules/sql.js/dist/', from: "sql-wasm.wasm",  to: './' },
        { context: './assets/fonts/', from: "*", to: './' },
        { context: './node_modules/react-native-vector-icons/Fonts/', from: "*", to: './' },
      ],
    }),

    new NodePolyfillPlugin(),

    new webpack.NormalModuleReplacementPlugin(
      /node_modules\/native-base.*utils\/index\.js/,
      path.join(__dirname, 'web-hacks/native-base-utils-hack.js'),
    ),

    new webpack.NormalModuleReplacementPlugin(
      /node_modules\/react-native-permissions/,
      path.join(__dirname, "web-hacks/react-native-permission.js"),
    ),

    new webpack.NormalModuleReplacementPlugin(
      /node_modules\/react-native-push-notification/,
      path.join(__dirname, "web-hacks/react-native-push-notification.js"),
    ),

    new webpack.NormalModuleReplacementPlugin(
      /node_modules\/react-native-sqlite-storage/,
      path.join(__dirname, "web-hacks/react-native-sqlite-storage.js"),
    ),

    new webpack.NormalModuleReplacementPlugin(
      /node_modules\/react-native-dialogs/,
      path.join(__dirname, "web-hacks/react-native-dialogs.js"),
    ),

    new webpack.NormalModuleReplacementPlugin(
      /node_modules\/react-native-fs/,
      path.join(__dirname, "web-hacks/react-native-fs.js"),
    ),

    new webpack.NormalModuleReplacementPlugin(
      /node_modules\/@react-native-community\/clipboard/,
      path.join(__dirname, "web-hacks/@react-native-community/clipboard.js"),
    ),

    new webpack.NormalModuleReplacementPlugin(
      /node_modules\/react-native-securerandom/,
      path.join(__dirname, "web-hacks/react-native-securerandom.js"),
    ),

    new webpack.NormalModuleReplacementPlugin(
      /node_modules\/react-native-build-config/,
      path.join(__dirname, "web-hacks/react-native-build-config.js"),
    ),
  ],
  resolve: {
    extensions: [
      '.web.tsx',
      '.web.ts',
      '.tsx',
      '.ts',
      '.web.jsx',
      '.web.js',
      '.jsx',
      '.js',
    ], // read files in fillowing order
    alias: Object.assign({
      'react-native$': 'react-native-web',
      'react-native-linear-gradient': 'react-native-web-linear-gradient',
      'react-native-maps': 'react-native-web-maps',
      'react-native-svg': 'react-native-svg-web',
      'react-native-webview': 'react-native-web-webview',
    }),

    // For sql.js
    fallback: {
      path: false,
      fs: false,
    },
  },
  devServer: {
    https: true,
    devMiddleware:{
      writeToDisk: true,
    }
  },
};

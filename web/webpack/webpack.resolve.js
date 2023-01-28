const isElectron = process.env.npm_lifecycle_event?.includes("electron");

module.exports = {
  extensions: [
    ".web.tsx",
    ".web.ts",
    ".tsx",
    ".ts",
    ".web.jsx",
    ".web.js",
    ".jsx",
    ".js",
  ], // read files in fillowing order
  alias: Object.assign({
    "react-native$": isElectron ? "react-native-electron" : "react-native-web",
    "react-native-linear-gradient": "react-native-web-linear-gradient",
    "react-native-maps": "react-native-web-maps",
    "react-native-svg": "react-native-svg-web",
    "react-native-webview": "react-native-web-webview",
  }),

  // For sql.js
  fallback: {
    path: false,
    fs: false,
  },
};

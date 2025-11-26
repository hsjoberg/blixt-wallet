import React from "react";
jest.mock("@react-native-async-storage/async-storage", () =>
  require("./mocks/@react-native-community/async-storage"),
);
jest.mock("react-native-build-config", () => require("./mocks/react-native-build-config"));
jest.mock("@notifee/react-native", () => require("@notifee/react-native/jest-mock"));
jest.mock("react-native-keychain", () => require("./mocks/react-native-keychain"));
jest.mock("react-native-securerandom", () => require("./mocks/react-native-securerandom"));
jest.mock("react-native-fingerprint-scanner", () =>
  require("./mocks/react-native-fingerprint-scanner"),
);
jest.mock("@react-native-clipboard/clipboard", () =>
  require("./mocks/@react-native-community/clipboard"),
);
jest.mock("@react-native-community/masked-view", () =>
  require("./mocks/@react-native-community/masked-view"),
);
jest.mock("@react-native-google-signin/google-signin", () =>
  require("./mocks/@react-native-community/google-signin"),
);
jest.mock("react-native-fs", () => require("./mocks/react-native-fs"));
jest.mock("react-native-document-picker", () => require("./mocks/react-native-document-picker"));
jest.mock("@react-native-community/geolocation", () =>
  require("./mocks/@react-native-community/geolocation"),
);
jest.mock("react-native-permissions", () => require("./mocks/react-native-permissions"));

jest.mock("./src/lndmobile/index", () => require("./mocks/lndmobile/index"));
jest.mock("./src/lndmobile/wallet", () => require("./mocks/lndmobile/wallet"));
jest.mock("./src/lndmobile/channel", () => require("./mocks/lndmobile/channel"));
jest.mock("./src/lndmobile/onchain", () => require("./mocks/lndmobile/onchain"));
jest.mock("./src/lndmobile/autopilot", () => require("./mocks/lndmobile/autopilot"));
jest.mock("./src/lndmobile/scheduled-sync", () => require("./mocks/lndmobile/scheduled-sync"));

jest.mock("./src/utils/constants.ts", () => require("./mocks/utils/constants"));

jest.mock("react-native-vision-camera", () => require("./mocks/react-native-vision-camera"));

const ReactNative = require("react-native");
ReactNative.NativeModules.LndMobile = {};
ReactNative.NativeModules.LndMobileTools = {};
ReactNative.NativeModules.LndMobileTools.log = jest.fn();
ReactNative.UIManager.configureNext = jest.fn();
ReactNative.UIManager.configureNextLayoutAnimation = jest.fn();
ReactNative.InteractionManager.runAfterInteractions = (cb) => {
  cb && cb();
};
ReactNative.Linking.addListener = jest.fn();

const NativeBase = require("native-base");
NativeBase.Toast.show = jest.fn();
NativeBase.Root = ({ children }) => <>{children}</>;

import "react-native-gesture-handler/jestSetup";
jest.mock("react-native-reanimated", () => {
  const Reanimated = require("react-native-reanimated/mock");

  // The mock for `call` immediately calls the callback which is incorrect
  // So we override it with a no-op
  Reanimated.default.call = () => {};

  return Reanimated;
});

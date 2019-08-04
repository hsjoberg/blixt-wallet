// https://github.com/kmagiera/react-native-gesture-handler/issues/344#issuecomment-450859200
import { NativeModules as RNNativeModules } from "react-native";

RNNativeModules.UIManager = RNNativeModules.UIManager || {};
RNNativeModules.UIManager.RCTView = RNNativeModules.UIManager.RCTView || {};
RNNativeModules.RNGestureHandlerModule = RNNativeModules.RNGestureHandlerModule || {
  State: { BEGAN: "BEGAN", FAILED: "FAILED", ACTIVE: "ACTIVE", END: "END" },
  attachGestureHandler: jest.fn(),
  createGestureHandler: jest.fn(),
  dropGestureHandler: jest.fn(),
  updateGestureHandler: jest.fn(),

};
RNNativeModules.PlatformConstants = RNNativeModules.PlatformConstants || {
  forceTouchAvailable: false
};

jest.mock("react-native-camera", () => require("./mocks/react-native-camera"));
jest.mock("@react-native-community/async-storage", () => require("./mocks/@react-native-community/async-storage"));
jest.mock('react-native-sqlite-storage', () => require("./mocks/react-native-sqlite-storage"));

jest.mock("./src/lndmobile/index", () => require("./mocks/lndmobile/index"));
jest.mock("./src/lndmobile/wallet", () => require("./mocks/lndmobile/wallet"));
jest.mock("./src/lndmobile/channel", () => require("./mocks/lndmobile/channel"));
jest.mock("./src/lndmobile/onchain", () => require("./mocks/lndmobile/onchain"));

import ReactNative, { AppRegistry, YellowBox, Platform, UIManager } from "react-native";
import App from "./src/App";
import {name as appName} from "./app.json";
import Long from "long";
import protobuf from "protobufjs";

protobuf.util.Long = Long;
protobuf.configure();

YellowBox.ignoreWarnings([
  // Workaround until native-base fixes their old
  "Warning: component",
  // We are putting functions in navigation route props
  "Non-serializable values were found in the navigation state",
  // Native-base doesn't have useNativeDriver for every animation
  "Animated: `useNativeDriver` was not specified"
]);

if (
  Platform.OS === "android" &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

AppRegistry.registerComponent(appName, () => App);

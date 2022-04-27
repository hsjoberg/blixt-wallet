import "react-native-gesture-handler";
import React from "react";
import ReactNative, { AppRegistry, LogBox, Platform, UIManager, Text } from "react-native";
import App from "./src/App";
import {name as appName} from "./app.json";
import Long from "long";
import protobuf from "protobufjs";
import { enableES5 } from "immer";
import "./src/i18n/i18n";


protobuf.util.Long = Long;
protobuf.configure();
enableES5();

LogBox.ignoreLogs([
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

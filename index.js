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
  "Animated: `useNativeDriver` was not specified",
  // Ignore react-native-tor warning
  "Module Tor requires main queue setup since it overrides `init` but doesn't implement `requiresMainQueueSetup`. In a future release React Native will default to initializing all native modules on a background thread unless explicitly opted-out of.",
  // Ignore intentional require cycle
  "Require cycle: node_modules/protobufjs/src/enum.js -> node_modules/protobufjs/src/namespace.js -> node_modules/protobufjs/src/field.js -> node_modules/protobufjs/src/enum.js",
  "Require cycle: src/storage/app.ts -> src/migration/app-migration.ts -> src/storage/app.ts",
  // Ignore i18next warning about missing Intl API
  "i18next::pluralResolver: Your environment seems not to be Intl API compatible, use an Intl.PluralRules polyfill. Will fallback to the compatibilityJSON v3 format handling.",
]);

if (
  Platform.OS === "android" &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

AppRegistry.registerComponent(appName, () => App);

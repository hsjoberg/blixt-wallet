import ReactNative, { AppRegistry, YellowBox, Platform, UIManager } from "react-native";
import App from "./src/App";
import {name as appName} from "./app.json";
import Long from "long";
import protobuf from "protobufjs";

protobuf.util.Long = Long;
protobuf.configure();

YellowBox.ignoreWarnings(["Warning: component"]); // Workaround until native-base fixes their old
                                                  // componentWillMount etc code
YellowBox.ignoreWarnings(["Non-serializable values were found in the navigation state"]); // We are putting functions in navigation route props
// componentWillMount etc code

if (
  Platform.OS === "android" &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

AppRegistry.registerComponent(appName, () => App);

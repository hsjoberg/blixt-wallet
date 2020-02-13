import ReactNative, { AppRegistry, YellowBox } from "react-native";
import App from "./src/App";
import {name as appName} from "./app.json";
import Long from "long";
import protobuf from "protobufjs";

protobuf.util.Long = Long;
protobuf.configure();

YellowBox.ignoreWarnings(["Warning: component"]); // Workaround until native-base fixes their old
                                                  // componentWillMount etc code

ReactNative.unstable_enableLogBox();

AppRegistry.registerComponent(appName, () => App);

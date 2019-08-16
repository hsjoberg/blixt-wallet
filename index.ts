import { AppRegistry, YellowBox } from "react-native";
import App from "./src/App";
import {name as appName} from "./app.json";
import Long from "long";
import protobuf from "protobufjs";
import bitcoin from "bitcoin-units";

bitcoin.setDisplay("satoshi", {
  format: "{amount} satoshi",
});

bitcoin.setDisplay('btc', {
  format: "{amount} ₿",
});

bitcoin.setDisplay('bit', {
  format: "{amount} bit",
  pluralize: true,
});

protobuf.util.Long = Long;
protobuf.configure();

YellowBox.ignoreWarnings(["Warning: component"]); // Workaround until native-base fixes their old
                                                  // componentWillMount etc code

AppRegistry.registerComponent(appName, () => App);

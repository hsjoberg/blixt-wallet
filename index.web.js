import 'setimmediate';
import { AppRegistry } from "react-native";
import App from "./src/App";
import AppConfig from "./app.json";
import Long from "long";
import protobuf from "protobufjs";
import { enableES5 } from "immer";

protobuf.util.Long = Long;
protobuf.configure();
enableES5();

AppRegistry.registerComponent(AppConfig.name, () => App);

AppRegistry.runApplication(AppConfig.name, {
  initialProps: {},
  rootTag: document.getElementById('blixt-web-root'),
})

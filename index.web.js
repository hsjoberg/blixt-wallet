import "setimmediate";
import { AppRegistry } from "react-native";
import App from "./src/App";
import AppConfig from "./app.json";
import { enableES5 } from "immer";

enableES5();

AppRegistry.registerComponent(AppConfig.name, () => App);

AppRegistry.runApplication(AppConfig.name, {
  initialProps: {},
  rootTag: document.getElementById("blixt-web-root"),
});

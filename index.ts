import { AppRegistry, YellowBox } from "react-native";
import App from "./src/App";
import {name as appName} from "./app.json";

YellowBox.ignoreWarnings(["Warning: component"]); // Workaround until native-base fixes their old
                                                  // componentWillMount etc code

AppRegistry.registerComponent(appName, () => App);

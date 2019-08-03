import { createStackNavigator } from "react-navigation";

import Settings from "./Settings";

export default createStackNavigator({
  Settings,
}, {
  headerMode: "none",
  initialRouteName: "Settings",
});

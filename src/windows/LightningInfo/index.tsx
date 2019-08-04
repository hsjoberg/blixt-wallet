import { createStackNavigator } from "react-navigation";
import LightningInfo from "./LightningInfo";
import OpenChannel from "./OpenChannel";

export default createStackNavigator({
  LightningInfo,
  OpenChannel,
}, {
  headerMode: "none",
  initialRouteName: "LightningInfo",
});

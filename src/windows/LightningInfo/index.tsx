import { createStackNavigator } from "react-navigation-stack";
import LightningInfo from "./LightningInfo";
import OpenChannel from "./OpenChannel";
import CameraFullscreen from "../CameraFullscreen";

export default createStackNavigator({
  LightningInfo,
  OpenChannel,
  CameraFullscreen,
}, {
  navigationOptions: {
    animationEnabled: false,
  },
  defaultNavigationOptions: {
    animationEnabled: false,
  },
  headerMode: "none",
  initialRouteName: "LightningInfo",
});

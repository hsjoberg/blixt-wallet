import { createStackNavigator } from "react-navigation-stack";
import LightningInfo from "./LightningInfo";
import OpenChannel from "./OpenChannel";
import CameraFullscreen from "../CameraFullscreen";

export default createStackNavigator({
  LightningInfo,
  OpenChannel,
  CameraFullscreen,
}, {
  headerMode: "none",
  initialRouteName: "LightningInfo",
});

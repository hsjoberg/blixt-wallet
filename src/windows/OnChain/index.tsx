import { createStackNavigator } from "react-navigation-stack";
import OnChainInfo from "./OnChainInfo";
import OnChainTransactionLog from "./OnChainTransactionLog";
import Withdraw from "./Withdraw";
import CameraFullscreen from "../CameraFullscreen";

export default createStackNavigator({
  OnChainInfo,
  OnChainTransactionLog,
  Withdraw,
  CameraFullscreen,
}, {
  navigationOptions: {
    animationEnabled: false,
  },
  defaultNavigationOptions: {
    animationEnabled: false,
  },
  headerMode: "none",
  initialRouteName: "OnChainInfo",
});

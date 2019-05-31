import { Animated, Easing } from "react-native";
import { createBottomTabNavigator, createAppContainer, createStackNavigator, createSwitchNavigator } from "react-navigation";

import FooterNav from "./components/FooterNav";
import Overview from "./windows/Overview";
import Send from "./windows/Send";
import Receive from "./windows/Receive";
import Settings from "./windows/Settings";
import LightningInfo from "./windows/LightningInfo";
import DEV_InitApp from "./DEV_InitApp";
import Welcome from "./Welcome";
import InitLightning from "./InitLightning";

const MainStack = createBottomTabNavigator({
  Overview,
}, {
  initialRouteName: "Overview",
  tabBarComponent: FooterNav,
});

const StackNavigator = createStackNavigator({
  Main: {
    screen: MainStack,
  },
  Receive,
  Send,
  Settings,
  LightningInfo,
}, {
  initialRouteName: "Main",
  transitionConfig : () => ({
    transitionSpec: {
      duration: 0,
      timing: Animated.timing,
      easing: Easing.step0,
    },
  }),
  mode: "modal",
  headerMode: "none",
});

const RootStack = createSwitchNavigator({
  DEV_InitApp,
  Welcome,
  InitLightning,
  Main: { screen: StackNavigator },
}, {
  initialRouteName: "DEV_InitApp",
});

export default createAppContainer(RootStack);

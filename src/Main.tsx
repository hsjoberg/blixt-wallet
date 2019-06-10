import { Animated, Easing } from "react-native";
import { createBottomTabNavigator, createAppContainer, createStackNavigator, createSwitchNavigator } from "react-navigation";

import FooterNav from "./components/FooterNav";
import Overview from "./windows/Overview";
import Send from "./windows/Send";
import Receive from "./windows/Receive";
import Settings from "./windows/Settings";
import LightningInfo from "./windows/LightningInfo";
import OnChain from "./windows/OnChain";
import DEV_InitApp from "./DEV_InitApp";
import Welcome from "./Welcome";
import Init from "./Init";
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
  OnChain,
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
  Init,
  InitLightning,
  Main: { screen: StackNavigator },
}, {
  initialRouteName: __DEV__ ? "DEV_InitApp" : "Init",
});

export default createAppContainer(RootStack);

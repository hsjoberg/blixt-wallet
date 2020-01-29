import React from "react";
import { Animated, Easing } from "react-native";
import { Root } from "native-base";
import { createAppContainer, createSwitchNavigator } from "react-navigation";
import { createStackNavigator } from "react-navigation-stack";
import { createBottomTabNavigator } from "react-navigation-tabs";

import { setTopLevelNavigator } from "./utils/navigation";
import FooterNav from "./components/FooterNav";
import Overview from "./windows/Overview";
import Send from "./windows/Send";
import Receive from "./windows/Receive";
import Settings from "./windows/Settings";
import LightningInfo from "./windows/LightningInfo";
import OnChain from "./windows/OnChain";
import Init from "./windows/InitProcess/Init";
import Authentication from "./windows/InitProcess/Authentication";
import DEV_Commands from "./windows/InitProcess/DEV_Commands";
import InitLightning from "./windows/InitProcess/InitLightning";
import Welcome from "./windows/Welcome";
import LightningNodeInfo from "./windows/Settings/LightningNodeInfo";
import About from "./windows/Settings/About";
import ChannelRequest from "./windows/LNURL/ChannelRequest";
import KeysendTest from "./windows/Keysend/Test";
import GoogleDriveTestbed from "./windows/Google/GoogleDriveTestbed";

import TransactionDetails from "./windows/TransactionDetails";
import OnChainTransactionDetails from "./windows/OnChain/OnChainTransactionDetails";

const MainStack = createBottomTabNavigator({
  Overview,
}, {
  navigationOptions: {
    animationEnabled: false,
  },
  initialRouteName: "Overview",
  tabBarComponent: FooterNav,
});

const StackNavigator = createStackNavigator({
  Main: {
    screen: MainStack,
  },
  TransactionDetails,
  OnChainTransactionDetails,
  LightningNodeInfo,
  About,
  Receive,
  Send,
  Settings,
  LightningInfo,
  OnChain,
  ChannelRequest,
  KeysendTest,
  GoogleDriveTestbed
}, {
  navigationOptions: {
    animationEnabled: false,
    headerShown: false,
    cardStyle: {
      backgroundColor: "transparent",
    },
  },
  defaultNavigationOptions: {
    animationEnabled: false,
    headerShown: false,
    cardStyle: {
      backgroundColor: "transparent",
    },
  },
  initialRouteName: "Main",
  mode: "modal",
  headerMode: "none",
});

const RootStack = createSwitchNavigator({
  DEV_Commands,
  Welcome,
  Init,
  Authentication,
  InitLightning,
  Main: { screen: StackNavigator },
}, {
  navigationOptions: {
    animationEnabled: false,
  },
  initialRouteName: __DEV__ ? "DEV_Commands" : "Init",
});

const AppContainer = createAppContainer(RootStack);

export default () => (
  <Root>
    <AppContainer
      ref={(navigatorRef) => setTopLevelNavigator(navigatorRef)}
    />
  </Root>
);

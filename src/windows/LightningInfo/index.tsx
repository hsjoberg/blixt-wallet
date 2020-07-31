import React from "react";
import { createStackNavigator, StackNavigationOptions } from "@react-navigation/stack";

import LightningInfo from "./LightningInfo";
import OpenChannel from "./OpenChannel";
import CameraFullscreen from "../CameraFullscreen";
import { NAVIGATION_SCREEN_OPTIONS } from "../../utils/constants";

const Stack = createStackNavigator();

export type LightningInfoStackParamList = {
  LightningInfo: undefined;
  OpenChannel: {
    peerUri?: string;
  };
  CameraFullscreen: {
    onRead: (data: string) => void;
  };
}

export default function LightningInfoIndex() {
  const screenOptions: StackNavigationOptions = {
    ...NAVIGATION_SCREEN_OPTIONS,
  };

  return (
    <Stack.Navigator initialRouteName="LightningInfo" screenOptions={screenOptions}>
      <Stack.Screen name="LightningInfo" component={LightningInfo} />
      <Stack.Screen name="OpenChannel" component={OpenChannel} />
      <Stack.Screen name="CameraFullscreen" component={CameraFullscreen} />
    </Stack.Navigator>
  )
}

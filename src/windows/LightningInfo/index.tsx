import React from "react";
import { createStackNavigator } from "@react-navigation/stack";

import LightningInfo from "./LightningInfo";
import OpenChannel from "./OpenChannel";
import CameraFullscreen from "../CameraFullscreen";

const Stack = createStackNavigator();

export type LightningInfoStackParamList = {
  LightningInfo: undefined;
  OpenChannel: undefined;
  CameraFullscreen: {
    onRead: (data: string) => void;
  };
}

export default function LightningInfoIndex() {
  return (
    <Stack.Navigator initialRouteName="LightningInfo" screenOptions={{ headerShown: false, animationEnabled: false, cardStyle: { backgroundColor: "transparent" } }}>
      <Stack.Screen name="LightningInfo" component={LightningInfo} />
      <Stack.Screen name="OpenChannel" component={OpenChannel} />
      <Stack.Screen name="CameraFullscreen" component={CameraFullscreen} />
    </Stack.Navigator>
  )
}

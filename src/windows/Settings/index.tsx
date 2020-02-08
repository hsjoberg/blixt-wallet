import React from "react";
import { createStackNavigator } from "@react-navigation/stack";

import Settings from "./Settings";
import SetPincode from "./SetPincode";
import RemovePincodeAuth from "./RemovePincodeAuth";
import ChangeFingerprintSettingsAuth from "./ChangeFingerprintSettingsAuth";
import LightningNodeInfo from "./LightningNodeInfo";
import About from "./About";

const Stack = createStackNavigator();

export type SettingsStackParamList = {
  Settings: undefined;
  RemovePincodeAuth: undefined;
  SetPincode: undefined;
  ChangeFingerprintSettingsAuth: undefined;
  LightningNodeInfo: undefined;
  About: undefined;
}

export default () => {
  return (
    <Stack.Navigator initialRouteName="Settings" screenOptions={{ headerShown: false, animationEnabled: false, cardStyle: { backgroundColor: "transparent" } }}>
      <Stack.Screen name="Settings" component={Settings} />
      <Stack.Screen name="RemovePincodeAuth" component={RemovePincodeAuth} />
      <Stack.Screen name="SetPincode" component={SetPincode} />
      <Stack.Screen name="ChangeFingerprintSettingsAuth" component={ChangeFingerprintSettingsAuth} />
      <Stack.Screen name="LightningNodeInfo" component={LightningNodeInfo} />
      <Stack.Screen name="About" component={About} />
    </Stack.Navigator>
  );
}

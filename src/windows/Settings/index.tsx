import React from "react";
import { createStackNavigator, StackNavigationOptions } from "@react-navigation/stack";

import Settings from "./Settings";
import SetPincode from "./SetPincode";
import RemovePincodeAuth from "./RemovePincodeAuth";
import ChangeFingerprintSettingsAuth from "./ChangeFingerprintSettingsAuth";
import LightningNodeInfo from "./LightningNodeInfo";
import About from "./About";
import TorShowOnionAddress from "./TorShowOnionAddress";
import { NAVIGATION_SCREEN_OPTIONS } from "../../utils/constants";

const Stack = createStackNavigator();

export type SettingsStackParamList = {
  Settings: undefined;
  RemovePincodeAuth: undefined;
  SetPincode: undefined;
  ChangeFingerprintSettingsAuth: undefined;
  LightningNodeInfo: undefined;
  About: undefined;
  TorShowOnionAddress: undefined;
}

export default function SettingsIndex() {
  const screenOptions: StackNavigationOptions = {
    ...NAVIGATION_SCREEN_OPTIONS,
  };

  return (
    <Stack.Navigator initialRouteName="Settings" screenOptions={screenOptions}>
      <Stack.Screen name="Settings" component={Settings} />
      <Stack.Screen name="RemovePincodeAuth" component={RemovePincodeAuth} />
      <Stack.Screen name="SetPincode" component={SetPincode} />
      <Stack.Screen name="ChangeFingerprintSettingsAuth" component={ChangeFingerprintSettingsAuth} />
      <Stack.Screen name="LightningNodeInfo" component={LightningNodeInfo} />
      <Stack.Screen name="About" component={About} />
      <Stack.Screen name="TorShowOnionAddress" component={TorShowOnionAddress} />
    </Stack.Navigator>
  );
}

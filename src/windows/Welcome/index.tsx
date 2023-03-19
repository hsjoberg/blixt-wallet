import React from "react";
import { createStackNavigator, StackNavigationOptions, CardStyleInterpolators } from "@react-navigation/stack";

import Start from "./Start";
import Seed from "./Seed";
import Confirm from "./Confirm";
import AlmostDone from "./AlmostDone";
import GoogleDriveBackup from "./GoogleDriveBackup";
import ICloudBackup from "./ICloudBackup";

import Restore from "./Restore";

import AddFunds from "./AddFunds";

import useStackNavigationOptions from "../../hooks/useStackNavigationOptions";
import SelectList, { ISelectListNavigationProps } from "../HelperWindows/SelectList";

const Stack = createStackNavigator();

export const StartSettings = {
  enableTor: "Enable Tor",
  disableTor: "Disable Tor",
  setBitcoinNode: "Set Bitcoin node",
  setLanguage: "Set Language"
};

export type WelcomeStackParamList = {
  Start: undefined;
  Seed: undefined;
  Confirm: undefined;
  GoogleDriveBackup: undefined;
  ICloudBackup: undefined;
  AlmostDone: undefined;

  Restore: undefined;

  AddFunds: undefined;

  SetPincode: undefined;
  RemovePincodeAuth: undefined;
  ChangeFingerprintSettingsAuth: undefined;

  Settings: ISelectListNavigationProps<keyof typeof StartSettings>;
};

export default function WelcomeIndex() {
  const screenOptions: StackNavigationOptions = {
    ...useStackNavigationOptions(),
    cardStyleInterpolator: CardStyleInterpolators.forHorizontalIOS,
  };

  return (
    <Stack.Navigator initialRouteName="Start" screenOptions={screenOptions}>
      <Stack.Screen name="Start" component={Start} />
      <Stack.Screen name="ChangeLanguage" component={SelectList} />
      <Stack.Screen name="Seed" component={Seed} />
      <Stack.Screen name="Confirm" component={Confirm} />
      <Stack.Screen name="GoogleDriveBackup" component={GoogleDriveBackup} />
      <Stack.Screen name="ICloudBackup" component={ICloudBackup} />
      <Stack.Screen name="AlmostDone" component={AlmostDone} />

      <Stack.Screen name="Restore" component={Restore} />

      <Stack.Screen name="AddFunds" component={AddFunds} />

      <Stack.Screen name="Settings" component={SelectList} />
    </Stack.Navigator>
  );
}

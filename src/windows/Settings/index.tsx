import React from "react";
import { createStackNavigator, StackNavigationOptions } from "@react-navigation/stack";

import Settings from "./Settings";
import SetPincode from "./SetPincode";
import RemovePincodeAuth from "./RemovePincodeAuth";
import ChangeFingerprintSettingsAuth from "./ChangeFingerprintSettingsAuth";
import LightningNodeInfo from "./LightningNodeInfo";
import About from "./About";
import TorShowOnionAddress from "./TorShowOnionAddress";
import LndMobileHelpCenter from "./LndMobileHelpCenter";
import useStackNavigationOptions from "../../hooks/useStackNavigationOptions";
import SelectList, { ISelectListNavigationProps } from "../HelperWindows/SelectList";
import { IFiatRates } from "../../state/Fiat";
import { OnchainExplorer } from "../../state/Settings";

const Stack = createStackNavigator();

export type SettingsStackParamList = {
  Settings: undefined;
  RemovePincodeAuth: undefined;
  SetPincode: undefined;
  ChangeFingerprintSettingsAuth: undefined;
  LightningNodeInfo: undefined;
  About: undefined;
  TorShowOnionAddress: undefined;
  LndMobileHelpCenter: undefined;
  ChangeBitcoinUnit: ISelectListNavigationProps<string>;
  ChangeFiatUnit: ISelectListNavigationProps<keyof IFiatRates>;
  ChangeOnchainExplorer: ISelectListNavigationProps<keyof typeof OnchainExplorer>;
}

export default function SettingsIndex() {
  const screenOptions: StackNavigationOptions = {
    ...useStackNavigationOptions(),
    animationEnabled: false,
  };

  return (
    <Stack.Navigator headerMode="screen" initialRouteName="Settings" screenOptions={screenOptions}>
      <Stack.Screen name="Settings" component={Settings} />
      <Stack.Screen name="RemovePincodeAuth" component={RemovePincodeAuth} />
      <Stack.Screen name="SetPincode" component={SetPincode} />
      <Stack.Screen name="ChangeFingerprintSettingsAuth" component={ChangeFingerprintSettingsAuth} />
      <Stack.Screen name="LightningNodeInfo" component={LightningNodeInfo} />
      <Stack.Screen name="About" component={About} />
      <Stack.Screen name="TorShowOnionAddress" component={TorShowOnionAddress} />
      <Stack.Screen name="LndMobileHelpCenter" component={LndMobileHelpCenter} />
      <Stack.Screen name="ChangeFiatUnit" component={SelectList} />
      <Stack.Screen name="ChangeBitcoinUnit" component={SelectList} />
      <Stack.Screen name="ChangeOnchainExplorer" component={SelectList} />
    </Stack.Navigator>
  );
}

import React from "react";
import {
  CardStyleInterpolators,
  createStackNavigator,
  StackNavigationOptions,
} from "@react-navigation/stack";

import Settings from "./Settings";
import SetPincode from "./SetPincode";
import RemovePincodeAuth from "./RemovePincodeAuth";
import ChangeFingerprintSettingsAuth from "./ChangeFingerprintSettingsAuth";
import LightningNodeInfo from "./LightningNodeInfo";
import LightningNetworkInfo from "./LightningNetworkInfo";
import About from "./About";
import TorShowOnionAddress from "./TorShowOnionAddress";
import LndMobileHelpCenter from "./LndMobileHelpCenter";
import useStackNavigationOptions from "../../hooks/useStackNavigationOptions";
import SelectList, { ISelectListNavigationProps } from "../HelperWindows/SelectList";
import { IFiatRates } from "../../state/Fiat";
import { LndLogLevel, OnchainExplorer } from "../../state/Settings";
import LightningPeers from "./LightningPeers";
import ConnectToLightningPeer from "./ConnectToLightningPeer";
import LndLog from "./LndLog";
import SpeedloaderLog from "./SpeedloaderLog";
import DunderDoctor from "./DunderDoctor";
import ToastLog from "./ToastLog";
import DebugLog from "./DebugLog";

const Stack = createStackNavigator();

export type SettingsStackParamList = {
  Settings: undefined;
  RemovePincodeAuth: undefined;
  SetPincode: undefined;
  ChangeFingerprintSettingsAuth: undefined;
  LightningNetworkInfo: undefined;
  LightningNodeInfo: undefined;
  About: undefined;
  TorShowOnionAddress: undefined;
  LndMobileHelpCenter: undefined;
  ChangeBitcoinUnit: ISelectListNavigationProps<string>;
  ChangeFiatUnit: ISelectListNavigationProps<keyof IFiatRates>;
  ChangeLanguage: ISelectListNavigationProps<string>;
  ChangeOnchainExplorer: ISelectListNavigationProps<keyof typeof OnchainExplorer | string>;
  ChangeLndLogLevel: ISelectListNavigationProps<LndLogLevel>;
  LightningPeers: undefined;
  ConnectToLighningPeer: undefined;
  ChannelProvider: ISelectListNavigationProps<string>;
  LndLog: undefined;
  SpeedloaderLog: undefined;
  DunderDoctor: undefined;
  ToastLog: undefined;
  DebugLog: undefined;
};

export default function SettingsIndex() {
  const screenOptions: StackNavigationOptions = {
    ...useStackNavigationOptions(),
    animation: "none",
  };

  return (
    <Stack.Navigator initialRouteName="SettingsMain" screenOptions={screenOptions}>
      <Stack.Screen name="SettingsMain" component={Settings} />
      <Stack.Screen name="RemovePincodeAuth" component={RemovePincodeAuth} />
      <Stack.Screen name="SetPincode" component={SetPincode} />
      <Stack.Screen
        name="ChangeFingerprintSettingsAuth"
        component={ChangeFingerprintSettingsAuth}
      />
      <Stack.Screen name="LightningNetworkInfo" component={LightningNetworkInfo} />
      <Stack.Screen name="LightningNodeInfo" component={LightningNodeInfo} />
      <Stack.Screen name="About" component={About} />
      <Stack.Screen name="TorShowOnionAddress" component={TorShowOnionAddress} />
      <Stack.Screen name="LndMobileHelpCenter" component={LndMobileHelpCenter} />
      <Stack.Screen name="ChangeFiatUnit" component={SelectList} />
      <Stack.Screen name="ChangeBitcoinUnit" component={SelectList} />
      <Stack.Screen name="ChangeLanguage" component={SelectList} />
      <Stack.Screen name="ChangeOnchainExplorer" component={SelectList} />
      <Stack.Screen name="ChangeLndLogLevel" component={SelectList} />
      <Stack.Screen name="LightningPeers" component={LightningPeers} />
      <Stack.Screen
        name="ConnectToLightningPeer"
        component={ConnectToLightningPeer}
        options={{
          // animationEnabled: true, // TODO(hsjoberg) check if we need to use `animation`
          cardStyleInterpolator: CardStyleInterpolators.forHorizontalIOS,
        }}
      />
      <Stack.Screen name="ChannelProvider" component={SelectList} />
      <Stack.Screen name="LndLog" component={LndLog} />
      <Stack.Screen name="SpeedloaderLog" component={SpeedloaderLog} />
      <Stack.Screen name="DunderDoctor" component={DunderDoctor} />
      <Stack.Screen name="ToastLog" component={ToastLog} />
      <Stack.Screen name="DebugLog" component={DebugLog} />
    </Stack.Navigator>
  );
}

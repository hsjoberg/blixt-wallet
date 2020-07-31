import React from "react";
import { createStackNavigator, StackNavigationOptions } from "@react-navigation/stack";

import OnChainInfo from "./OnChainInfo";
import OnChainTransactionLog from "./OnChainTransactionLog";
import OnChainTransactionDetails from "./OnChainTransactionDetails";
import Withdraw from "./Withdraw";
import CameraFullscreen from "../CameraFullscreen";
import { NAVIGATION_SCREEN_OPTIONS } from "../../utils/constants";

const Stack = createStackNavigator();

export type OnChainStackParamList = {
  OnChainInfo: undefined;
  OnChainTransactionLog: undefined;
  OnChainTransactionDetails: {
    txId: string;
  };
  Withdraw: undefined;
  CameraFullscreen: {
    onRead: (data: string) => void;
  };
}

export default function OnChainIndex() {
  const screenOptions: StackNavigationOptions = {
    ...NAVIGATION_SCREEN_OPTIONS,
  };

  return (
    <Stack.Navigator initialRouteName="OnChainInfo" screenOptions={screenOptions}>
      <Stack.Screen name="OnChainInfo" component={OnChainInfo} />
      <Stack.Screen name="OnChainTransactionLog" component={OnChainTransactionLog} />
      <Stack.Screen name="OnChainTransactionDetails" component={OnChainTransactionDetails} />
      <Stack.Screen name="Withdraw" component={Withdraw} />
      <Stack.Screen name="CameraFullscreen" component={CameraFullscreen} />
    </Stack.Navigator>
  )
}

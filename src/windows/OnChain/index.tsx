import React from "react";
import {
  createStackNavigator,
  StackNavigationOptions,
  CardStyleInterpolators,
} from "@react-navigation/stack";

import OnChainInfo from "./OnChainInfo";
import OnChainTransactionLog from "./OnChainTransactionLog";
import OnChainTransactionDetails from "./OnChainTransactionDetails";
import Withdraw from "./Withdraw";
import CameraFullscreen from "../CameraFullscreen";
import useStackNavigationOptions from "../../hooks/useStackNavigationOptions";
import { Platform } from "react-native";
import { PLATFORM } from "../../utils/constants";

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
};

export default function OnChainIndex() {
  const screenOptions: StackNavigationOptions = {
    ...useStackNavigationOptions(),
    gestureEnabled: PLATFORM === "ios",
  };

  return (
    <Stack.Navigator initialRouteName="OnChainInfo" screenOptions={screenOptions}>
      <Stack.Screen name="OnChainInfo" component={OnChainInfo} />
      <Stack.Screen
        name="OnChainTransactionLog"
        component={OnChainTransactionLog}
        options={{
          cardStyleInterpolator: CardStyleInterpolators.forHorizontalIOS,
        }}
      />
      <Stack.Screen
        name="OnChainTransactionDetails"
        component={OnChainTransactionDetails}
        options={{
          animation: "none",
          cardStyleInterpolator: CardStyleInterpolators.forNoAnimation,
        }}
      />
      <Stack.Screen
        name="Withdraw"
        component={Withdraw}
        options={{
          cardStyleInterpolator: CardStyleInterpolators.forHorizontalIOS,
        }}
      />
      <Stack.Screen
        name="CameraFullscreen"
        component={CameraFullscreen}
        options={{
          gestureEnabled: true,
          gestureResponseDistance: 1000,
          cardStyleInterpolator: CardStyleInterpolators.forHorizontalIOS,
        }}
      />
    </Stack.Navigator>
  );
}

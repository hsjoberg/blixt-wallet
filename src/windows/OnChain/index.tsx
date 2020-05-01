import React from "react";
import { createStackNavigator } from "@react-navigation/stack";

import OnChainInfo from "./OnChainInfo";
import OnChainTransactionLog from "./OnChainTransactionLog";
import OnChainTransactionDetails from "./OnChainTransactionDetails";
import Withdraw from "./Withdraw";
import CameraFullscreen from "../CameraFullscreen";

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
  return (
    <Stack.Navigator initialRouteName="OnChainInfo" screenOptions={{ headerShown: false, animationEnabled: false, cardStyle: { backgroundColor: "transparent" } }}>
      <Stack.Screen name="OnChainInfo" component={OnChainInfo} />
      <Stack.Screen name="OnChainTransactionLog" component={OnChainTransactionLog} />
      <Stack.Screen name="OnChainTransactionDetails" component={OnChainTransactionDetails} />
      <Stack.Screen name="Withdraw" component={Withdraw} />
      <Stack.Screen name="CameraFullscreen" component={CameraFullscreen} />
    </Stack.Navigator>
  )
}

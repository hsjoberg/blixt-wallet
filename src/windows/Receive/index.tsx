import React from "react"
import { createStackNavigator, StackNavigationOptions } from "@react-navigation/stack";

import ReceiveSetup from "./ReceiveSetup";
import ReceiveQr from "./ReceiveQr";
import { lnrpc } from "../../../proto/proto";
import { NAVIGATION_SCREEN_OPTIONS } from "../../utils/constants";

const Stack = createStackNavigator();

export type ReceiveStackParamList = {
  ReceiveSetup: undefined;
  ReceiveQr: {
    invoice: lnrpc.AddInvoiceResponse;
  };
}

export default function ReceiveIndex() {
  const screenOptions: StackNavigationOptions = {
    ...NAVIGATION_SCREEN_OPTIONS,
  };

  return (
    <Stack.Navigator initialRouteName="ReceiveSetup" screenOptions={screenOptions}>
      <Stack.Screen name="ReceiveSetup" component={ReceiveSetup} />
      <Stack.Screen name="ReceiveQr" component={ReceiveQr} />
    </Stack.Navigator>
  )
}
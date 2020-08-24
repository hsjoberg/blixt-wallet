import React from "react"
import { createStackNavigator, StackNavigationOptions, CardStyleInterpolators } from "@react-navigation/stack";

import ReceiveSetup from "./ReceiveSetup";
import ReceiveQr from "./ReceiveQr";
import { lnrpc } from "../../../proto/proto";
import useStackNavigationOptions from "../../hooks/useStackNavigationOptions";

const Stack = createStackNavigator();

export type ReceiveStackParamList = {
  ReceiveSetup: undefined;
  ReceiveQr: {
    invoice: lnrpc.AddInvoiceResponse;
  };
}

export default function ReceiveIndex() {
  const screenOptions: StackNavigationOptions = {
    ...useStackNavigationOptions(),
  };

  return (
    <Stack.Navigator initialRouteName="ReceiveSetup" screenOptions={screenOptions}>
      <Stack.Screen name="ReceiveSetup" component={ReceiveSetup} />
      <Stack.Screen name="ReceiveQr" component={ReceiveQr} options={{
        cardStyleInterpolator: CardStyleInterpolators.forHorizontalIOS,
      }} />
    </Stack.Navigator>
  )
}
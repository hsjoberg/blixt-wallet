import React from "react"
import { createStackNavigator } from "@react-navigation/stack";

import ReceiveSetup from "./ReceiveSetup";
import ReceiveQr from "./ReceiveQr";
import { lnrpc } from "../../../proto/proto";

const Stack = createStackNavigator();

export type ReceiveStackParamList = {
  ReceiveSetup: undefined;
  ReceiveQr: {
    invoice: lnrpc.AddInvoiceResponse;
  };
}

export default () => {
  return (
    <Stack.Navigator initialRouteName="ReceiveSetup" screenOptions={{ headerShown: false, animationEnabled: false }}>
      <Stack.Screen name="ReceiveSetup" component={ReceiveSetup} />
      <Stack.Screen name="ReceiveQr" component={ReceiveQr} />
    </Stack.Navigator>
  )
}
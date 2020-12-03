import React from "react"
import { createStackNavigator, StackNavigationOptions, CardStyleInterpolators } from "@react-navigation/stack";

import ReceiveSetup from "./ReceiveSetup";
import ReceiveQr from "./ReceiveQr";
import { lnrpc } from "../../../proto/proto";
import useStackNavigationOptions from "../../hooks/useStackNavigationOptions";
import SelectList, { ISelectListNavigationProps } from "../HelperWindows/SelectList";
import { IFiatRates } from "../../state/Fiat";

const Stack = createStackNavigator();

export type ReceiveStackParamList = {
  ReceiveSetup: undefined;
  ReceiveQr: {
    invoice: lnrpc.AddInvoiceResponse;
  };
  ChangeBitcoinUnit: ISelectListNavigationProps<string>;
  ChangeFiatUnit: ISelectListNavigationProps<keyof IFiatRates>;
}

export default function ReceiveIndex() {
  const screenOptions: StackNavigationOptions = {
    ...useStackNavigationOptions(),
  };

  return (
    <Stack.Navigator headerMode="screen" initialRouteName="ReceiveSetup" screenOptions={screenOptions}>
      <Stack.Screen name="ReceiveSetup" component={ReceiveSetup} />
      <Stack.Screen name="ReceiveQr" component={ReceiveQr} options={{
        cardStyleInterpolator: CardStyleInterpolators.forHorizontalIOS,
      }} />
      <Stack.Screen name="ChangeFiatUnit" component={SelectList} />
      <Stack.Screen name="ChangeBitcoinUnit" component={SelectList} />
    </Stack.Navigator>
  )
}
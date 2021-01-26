import React from "react"
import { createStackNavigator, StackNavigationOptions, CardStyleInterpolators } from "@react-navigation/stack";

import ReceiveSetup from "./ReceiveSetup";
import ReceiveSetupLsp from "./ReceiveSetupLsp";
import ReceiveQr from "./ReceiveQr";
import DunderLspInfo from "./DunderLspInfo";

import { lnrpc } from "../../../proto/proto";
import useStackNavigationOptions from "../../hooks/useStackNavigationOptions";
import SelectList, { ISelectListNavigationProps } from "../HelperWindows/SelectList";
import { IFiatRates } from "../../state/Fiat";
import { Chain, Flavor } from "../../utils/build";

const Stack = createStackNavigator();

export type ReceiveStackParamList = {
  ReceiveSetup: undefined;
  ReceiveQr: {
    invoice: lnrpc.AddInvoiceResponse;
  };
  ChangeBitcoinUnit: ISelectListNavigationProps<string>;
  ChangeFiatUnit: ISelectListNavigationProps<keyof IFiatRates>;
  DunderLspInfo: undefined;
}

const animationDisabled = {
  animationEnabled: false,
  cardStyleInterpolator: CardStyleInterpolators.forNoAnimation,
};

export default function ReceiveIndex() {
  const screenOptions: StackNavigationOptions = {
    ...useStackNavigationOptions(),
  };

  return (
    <Stack.Navigator headerMode="screen" initialRouteName={Chain === "mainnet" || Flavor === "fakelnd" ? "ReceiveSetup" : "ReceiveSetupLsp"} screenOptions={screenOptions}>
      <Stack.Screen name="ReceiveSetupLsp" component={ReceiveSetupLsp} />
      <Stack.Screen name="ReceiveSetup" component={ReceiveSetup} />
      <Stack.Screen name="ReceiveQr" component={ReceiveQr} options={{
        cardStyleInterpolator: CardStyleInterpolators.forHorizontalIOS,
      }} />
      <Stack.Screen name="ChangeFiatUnit" component={SelectList} />
      <Stack.Screen name="ChangeBitcoinUnit" component={SelectList} />
      <Stack.Screen name="DunderLspInfo" component={DunderLspInfo} options={animationDisabled} />
    </Stack.Navigator>
  )
}

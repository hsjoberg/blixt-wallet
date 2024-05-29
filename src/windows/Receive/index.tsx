import React from "react";
import {
  createStackNavigator,
  StackNavigationOptions,
  CardStyleInterpolators,
} from "@react-navigation/stack";

import ReceiveSetup from "./ReceiveSetup";
import ReceiveSetupLsp from "./ReceiveSetupLsp";
import ReceiveQr from "./ReceiveQr";
import DunderLspInfo from "./DunderLspInfo";

import { lnrpc } from "../../../proto/lightning";
import useStackNavigationOptions from "../../hooks/useStackNavigationOptions";
import SelectList, { ISelectListNavigationProps } from "../HelperWindows/SelectList";
import { IFiatRates } from "../../state/Fiat";
import { useStoreState } from "../../state/store";

const Stack = createStackNavigator();

export type ReceiveStackParamList = {
  ReceiveSetup: undefined;
  ReceiveQr: {
    invoice: lnrpc.AddInvoiceResponse;
  };
  ChangeBitcoinUnit: ISelectListNavigationProps<string>;
  ChangeFiatUnit: ISelectListNavigationProps<keyof IFiatRates>;
  DunderLspInfo: undefined;
};

const animationDisabled = {
  animation: "none",
  cardStyleInterpolator: CardStyleInterpolators.forNoAnimation,
};

export default function ReceiveIndex() {
  const dunderEnabled = useStoreState((store) => store.settings.dunderEnabled);

  const screenOptions: StackNavigationOptions = {
    ...useStackNavigationOptions(),
  };

  return (
    <Stack.Navigator
      initialRouteName={dunderEnabled ? "ReceiveSetupLsp" : "ReceiveSetup"}
      screenOptions={screenOptions}
    >
      <Stack.Screen name="ReceiveSetupLsp" component={ReceiveSetupLsp} />
      <Stack.Screen name="ReceiveSetup" component={ReceiveSetup} />
      <Stack.Screen
        name="ReceiveQr"
        component={ReceiveQr}
        options={{
          cardStyleInterpolator: CardStyleInterpolators.forHorizontalIOS,
        }}
      />
      <Stack.Screen name="ChangeFiatUnit" component={SelectList} />
      <Stack.Screen name="ChangeBitcoinUnit" component={SelectList} />
      <Stack.Screen name="DunderLspInfo" component={DunderLspInfo} options={animationDisabled} />
    </Stack.Navigator>
  );
}

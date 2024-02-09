import React from "react";
import LightningBoxRegistration from "./LightningBoxRegistration";

import {
  CardStyleInterpolators,
  createStackNavigator,
  StackNavigationOptions,
} from "@react-navigation/stack";
import useStackNavigationOptions from "../../hooks/useStackNavigationOptions";
import { useStoreState } from "../../state/store";
import LightningBoxInfo from "./LightningBoxInfo";

const Stack = createStackNavigator();

export type LightningBoxStackParamList = {
  LightningBoxRegistration: undefined;
  LightningBoxInfo: undefined;
};

export default function LightningBox() {
  // We use the setting in order to decide whether the user should go to the
  // registration screen or info screen.
  const lightningBoxAddress = useStoreState((store) => store.settings.lightningBoxAddress);

  const screenOptions: StackNavigationOptions = {
    ...useStackNavigationOptions(),
  };

  return (
    <Stack.Navigator
      initialRouteName={!lightningBoxAddress ? "LightningBoxRegistration" : "LightningBoxInfo"}
      screenOptions={screenOptions}
    >
      <Stack.Screen
        name="LightningBoxRegistration"
        component={LightningBoxRegistration}
        options={{ cardStyleInterpolator: CardStyleInterpolators.forHorizontalIOS }}
      />
      <Stack.Screen
        name="LightningBoxInfo"
        component={LightningBoxInfo}
        options={{ cardStyleInterpolator: CardStyleInterpolators.forHorizontalIOS }}
      />
    </Stack.Navigator>
  );
}

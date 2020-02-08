import React from "react";
import { createStackNavigator } from "@react-navigation/stack";

import Start from "./Start";
import Seed from "./Seed";
import Confirm from "./Confirm";
import AddFunds from "./AddFunds";
import AlmostDone from "./AlmostDone";
import Restore from "./Restore";

const Stack = createStackNavigator();

export type WelcomeStackParamList = {
  Start: undefined;
  Seed: undefined;
  Confirm: undefined;
  AddFunds: undefined;
  AlmostDone: undefined;
  Restore: undefined;

  SetPincode: undefined;
  RemovePincodeAuth: undefined;
  ChangeFingerprintSettingsAuth: undefined;
}

export default () => {
  return (
    <Stack.Navigator initialRouteName="Settings" screenOptions={{ headerShown: false, animationEnabled: false, cardStyle: { backgroundColor: "transparent" } }}>
      <Stack.Screen name="Start" component={Start} />
      <Stack.Screen name="Seed" component={Seed} />
      <Stack.Screen name="Confirm" component={Confirm} />
      <Stack.Screen name="AddFunds" component={AddFunds} />
      <Stack.Screen name="AlmostDone" component={AlmostDone} />
      <Stack.Screen name="Restore" component={Restore} />
    </Stack.Navigator>
  );
}

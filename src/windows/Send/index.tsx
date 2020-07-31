import React from "react";
import { createStackNavigator, StackNavigationOptions, CardStyleInterpolators } from "@react-navigation/stack";
import SendCamera from "./SendCamera";
import SendConfirmation from "./SendConfirmation";
import SendDone from "./SendDone";
import { NAVIGATION_SCREEN_OPTIONS } from "../../utils/constants";

const Stack = createStackNavigator();

export type SendStackParamList = {
  SendCamera: undefined;
  SendConfirmation?: {
    callback?: (r: Uint8Array | null) => void;
  };
  SendDone: undefined;
}

export default function SendIndex() {
  const screenOptions: StackNavigationOptions = {
    ...NAVIGATION_SCREEN_OPTIONS,
  };

  return (
    <Stack.Navigator initialRouteName="SendCamera" screenOptions={screenOptions}>
      <Stack.Screen name="SendCamera" component={SendCamera} />
      <Stack.Screen name="SendConfirmation" component={SendConfirmation} />
      <Stack.Screen name="SendDone" component={SendDone} />
    </Stack.Navigator>
  )
}

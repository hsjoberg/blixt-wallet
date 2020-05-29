import React from "react";
import { createStackNavigator } from "@react-navigation/stack";
import SendCamera from "./SendCamera";
import SendConfirmation from "./SendConfirmation";
import SendDone from "./SendDone";

const Stack = createStackNavigator();

export type SendStackParamList = {
  SendCamera: undefined;
  SendConfirmation?: {
    callback?: (r: Uint8Array | null) => void;
  };
  SendDone: undefined;
}

export default function SendIndex() {
  return (
    <Stack.Navigator initialRouteName="SendCamera" screenOptions={{ headerShown: false, animationEnabled: false }}>
      <Stack.Screen name="SendCamera" component={SendCamera} />
      <Stack.Screen name="SendConfirmation" component={SendConfirmation} />
      <Stack.Screen name="SendDone" component={SendDone} />
    </Stack.Navigator>
  )
}

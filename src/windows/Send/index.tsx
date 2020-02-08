import React from "react";
import { createStackNavigator } from "@react-navigation/stack";
import SendCamera from "./SendCamera";
import SendConfirmation from "./SendConfirmation";

const Stack = createStackNavigator();

export type SendStackParamList = {
  SendCamera: undefined;
  SendConfirmation: undefined;
}

export default () => {
  return (
    <Stack.Navigator initialRouteName="SendCamera" screenOptions={{ headerShown: false, animationEnabled: false }}>
      <Stack.Screen name="SendCamera" component={SendCamera} />
      <Stack.Screen name="SendConfirmation" component={SendConfirmation} />
    </Stack.Navigator>
  )
}

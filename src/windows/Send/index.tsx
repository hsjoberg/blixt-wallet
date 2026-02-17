import React from "react";
import {
  createStackNavigator,
  StackNavigationOptions,
  CardStyleInterpolators,
} from "@react-navigation/stack";
import SendCamera from "./SendCamera";
import SendConfirmation from "./SendConfirmation";
import SendDone from "./SendDone";
import useStackNavigationOptions from "../../hooks/useStackNavigationOptions";

export type SendStackParamList = {
  SendCamera: undefined;
  SendConfirmation: {
    callback?: (r: Uint8Array | null) => void;
  };
  SendDone: {
    preimage: Uint8Array;
    callback?: (r: Uint8Array | null) => void;
  };
};

const Stack = createStackNavigator<SendStackParamList>();

export default function SendIndex() {
  const screenOptions: StackNavigationOptions = {
    ...useStackNavigationOptions(),
  };

  return (
    <Stack.Navigator initialRouteName="SendCamera" screenOptions={screenOptions}>
      <Stack.Screen
        name="SendCamera"
        component={SendCamera}
        options={{
          cardStyleInterpolator: CardStyleInterpolators.forHorizontalIOS,
        }}
      />
      <Stack.Screen name="SendConfirmation" component={SendConfirmation} />
      <Stack.Screen name="SendDone" component={SendDone} />
    </Stack.Navigator>
  );
}

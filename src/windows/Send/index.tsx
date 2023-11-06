import React from "react";
import {
  createStackNavigator,
  StackNavigationOptions,
  CardStyleInterpolators,
} from "@react-navigation/stack";
import SendCamera from "./SendCamera";
import SendCameraKit from "./SendCameraKit";
import SendConfirmation from "./SendConfirmation";
import SendDone from "./SendDone";
import useStackNavigationOptions from "../../hooks/useStackNavigationOptions";
import { RouteProp } from "@react-navigation/native";
import { PLATFORM } from "../../utils/constants";

const Stack = createStackNavigator();

export type SendStackParamList = {
  SendCamera?: {
    viaSwipe: boolean;
  };
  SendCameraKit?: {
    viaSwipe: boolean;
  };
  SendConfirmation?: {
    callback?: (r: Uint8Array | null) => void;
  };
  SendDone: {
    preimage: Uint8Array;
    callback?: (r: Uint8Array | null) => void;
  };
};

export default function SendIndex({
  route,
}: {
  route: RouteProp<{ Send: { viaSwipe: boolean | undefined } | undefined }, "Send">;
}) {
  const screenOptions: StackNavigationOptions = {
    ...useStackNavigationOptions(),
  };

  const viaSwipe = route.params?.viaSwipe;

  return (
    <Stack.Navigator initialRouteName="SendCamera" screenOptions={screenOptions}>
      <Stack.Screen
        initialParams={viaSwipe !== undefined ? { viaSwipe } : undefined}
        name="SendCamera"
        component={SendCamera}
        options={{
          cardStyleInterpolator: CardStyleInterpolators.forHorizontalIOS,
        }}
      />
      <Stack.Screen
        initialParams={viaSwipe !== undefined ? { viaSwipe } : undefined}
        name={"SendCameraKit"}
        component={SendCameraKit}
        options={{
          cardStyleInterpolator: CardStyleInterpolators.forHorizontalIOS,
        }}
      />
      <Stack.Screen
        name="SendConfirmation"
        component={SendConfirmation}
        options={{
          cardStyleInterpolator: CardStyleInterpolators.forHorizontalIOS,
        }}
      />
      <Stack.Screen
        name="SendDone"
        component={SendDone}
        options={{
          cardStyleInterpolator: CardStyleInterpolators.forNoAnimation,
        }}
      />
    </Stack.Navigator>
  );
}

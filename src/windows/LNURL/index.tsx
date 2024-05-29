import React from "react";
import { createStackNavigator, StackNavigationOptions } from "@react-navigation/stack";

import useStackNavigationOptions from "../../hooks/useStackNavigationOptions";
import AuthRequest from "./AuthRequest";
import ChannelRequest from "./ChannelRequest";
import WithdrawRequest from "./WithdrawRequest";
import PayRequest from "./PayRequest";
import PayRequestAboutLightningAddress from "./PayRequestAboutLightningAddress";

const Stack = createStackNavigator();

export type LnUrlStackParamList = {
  default: undefined;
  AuthRequest: undefined;
  ChannelRequest: undefined;
  WithdrawRequest: undefined;
  PayRequest: {
    callback?: (r: Uint8Array | null) => void;
  };
  PayRequestAboutLightningAddress: undefined;
};

export default function LNUURLIndex() {
  const screenOptions: StackNavigationOptions = {
    ...useStackNavigationOptions(),
    animation: "none",
  };

  return (
    <Stack.Navigator initialRouteName="default" screenOptions={screenOptions}>
      <Stack.Screen name="default">{() => <></>}</Stack.Screen>
      <Stack.Screen name="AuthRequest" component={AuthRequest} />
      <Stack.Screen name="ChannelRequest" component={ChannelRequest} />
      <Stack.Screen name="WithdrawRequest" component={WithdrawRequest} />
      <Stack.Screen name="PayRequest" component={PayRequest} />
      <Stack.Screen
        name="PayRequestAboutLightningAddress"
        component={PayRequestAboutLightningAddress}
      />
    </Stack.Navigator>
  );
}

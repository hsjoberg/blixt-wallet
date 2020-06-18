import React from "react"
import { createStackNavigator } from "@react-navigation/stack";

import AuthRequest from "./AuthRequest";
import ChannelRequest from "./ChannelRequest";
import WithdrawRequest from "./WithdrawRequest";
import PayRequest from "./PayRequest";

const Stack = createStackNavigator();

export type ReceiveStackParamList = {
  default: undefined;
  AuthRequest: undefined;
  ChannelRequest: undefined;
  WithdrawRequest: undefined;
  PayRequest: undefined;
}

export default function LNUURLIndex() {
  return (
    <Stack.Navigator initialRouteName="default" screenOptions={{ cardStyle: { backgroundColor:"transparent"}, headerShown: false, animationEnabled: false }}>
      <Stack.Screen name="default">{() => (<></>)}</Stack.Screen>
      <Stack.Screen name="AuthRequest" component={AuthRequest} />
      <Stack.Screen name="ChannelRequest" component={ChannelRequest} />
      <Stack.Screen name="WithdrawRequest" component={WithdrawRequest} />
      <Stack.Screen name="PayRequest" component={PayRequest} />
    </Stack.Navigator>
  )
}
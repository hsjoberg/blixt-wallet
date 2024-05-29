import React from "react";
import { createStackNavigator, StackNavigationOptions } from "@react-navigation/stack";

import ContactList from "./ContactList";
import useStackNavigationOptions from "../../hooks/useStackNavigationOptions";

const Stack = createStackNavigator();

export type ContactsStackParamList = {
  ContactList: undefined;
};

export default function ContactsIndex() {
  const screenOptions: StackNavigationOptions = {
    ...useStackNavigationOptions(),
    animation: "none",
  };

  return (
    <Stack.Navigator initialRouteName="ContactList" screenOptions={screenOptions}>
      <Stack.Screen name="ContactList" component={ContactList} />
    </Stack.Navigator>
  );
}

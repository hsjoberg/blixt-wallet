import React from "react";
import { View } from "react-native";

export default ({ children }: {children: JSX.Element | JSX.Element[]}) => (
  <View style={{ width: "100%", height: "100%"}}>
    {children}
  </View>
)

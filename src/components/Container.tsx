import React, { ReactNode } from "react";
import { View, StyleSheet, StyleProp, ViewStyle } from "react-native";

export interface IContainer {
  children?: ReactNode;
  centered?: boolean;
  style?: StyleProp<ViewStyle>;
}
export default ({ children, centered, style }: IContainer) => (
  <View style={[
    defaultStyle.style,
    centered ? centeredStyle.style : {},
    style
  ]}>
    {children}
  </View>
)

const defaultStyle = StyleSheet.create({
  style: {
    width: "100%",
    height: "100%",
    flex: 1,
  },
});

const centeredStyle = StyleSheet.create({
  style: {
    flex: 1,
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
})

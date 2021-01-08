import React, { ReactNode } from "react";
import { View, StyleSheet, StyleProp, ViewStyle } from "react-native";
import { blixtTheme } from "../native-base-theme/variables/commonColor";

export interface IContainer {
  children?: ReactNode;
  centered?: boolean;
  style?: StyleProp<ViewStyle>;
}
export default function Container({ children, centered, style }: IContainer) {
  return (
    <View style={[
      defaultStyle.style,
      centered ? centeredStyle.style : {},
      style
    ]}>
      {children}
    </View>
  );
}

const defaultStyle = StyleSheet.create({
  style: {
    width: "100%",
    height: "100%",
    flex: 1,
    backgroundColor: blixtTheme.dark,
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

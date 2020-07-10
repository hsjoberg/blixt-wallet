import React, { ReactNode } from "react";
import { Content } from "native-base";
import { StyleProp, ViewStyle, StyleSheet } from "react-native";
import { ScrollView } from "react-native-gesture-handler";

export interface IContentProps {
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
  centered?: boolean;
}
export default function BlixtContent({ children, style, centered }: IContentProps) {
  return (
    <ScrollView contentContainerStyle={[
      { padding: 14 },
      centered ? centeredStyle.style : {},
      style,
    ]}>
      {children}
    </ScrollView>
  );
}

const centeredStyle = StyleSheet.create({
  style: {
    flex: 1,
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
})
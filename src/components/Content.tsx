import React, { ReactNode } from "react";
import { Content } from "native-base";
import { StyleProp, ViewStyle } from "react-native";

export interface IContentProps {
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
}
export default function Content({ children, style }: IContentProps) {
  return (
    <Content contentContainerStyle={[{ padding: 14 }, style]}>
      {children}
    </Content>
  );
}
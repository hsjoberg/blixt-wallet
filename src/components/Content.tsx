import React from "react";
import { Content } from "native-base";
import { StyleProp, ViewStyle } from "react-native";

export interface IContentProps {
  children: JSX.Element | JSX.Element[];
  style?: StyleProp<ViewStyle>;
}
export default ({ children, style }: IContentProps) => (
  <Content contentContainerStyle={[{ padding: 14 }, style]}>
    {children}
  </Content>
)

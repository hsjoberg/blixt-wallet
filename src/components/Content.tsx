import React, { ReactNode } from "react";
import { Content } from "native-base";
import { StyleProp, ViewStyle } from "react-native";

export interface IContentProps {
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
}
export default ({ children, style }: IContentProps) => (
  <Content contentContainerStyle={[{ padding: 14 }, style]}>
    {children}
  </Content>
)

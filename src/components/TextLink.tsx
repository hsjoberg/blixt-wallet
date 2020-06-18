import React, { ReactNode } from "react";
import { Linking, TextStyle } from "react-native";
import { Text } from "native-base";

export interface ITextLinkProps {
  url: string;
  children?: ReactNode;
  style?: TextStyle;
}
export default function TextLink({ url, children, style }: ITextLinkProps) {
  return (
    <Text onPress={() => Linking.openURL(url)} style={[{ color: "#4f9ca8" }, style]}>
      {children}
    </Text>
  );
}
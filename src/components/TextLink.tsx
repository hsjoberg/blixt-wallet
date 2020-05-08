import React, { ReactNode } from "react";
import { Linking } from "react-native";
import { Text } from "native-base";

export interface ITextLinkProps {
  url: string;
  children?: ReactNode;
}
export default function TextLink({ url, children }: ITextLinkProps) {
  return (
    <Text onPress={() => Linking.openURL(url)} style={{ color: "#4f9ca8" }}>
      {children}
    </Text>
  );
}
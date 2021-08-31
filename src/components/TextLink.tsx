import React, { ReactNode } from "react";
import { Linking, TextStyle } from "react-native";
import { Text } from "native-base";
import { blixtTheme } from "../native-base-theme/variables/commonColor";

export interface ITextLinkProps {
  url: string;
  children?: ReactNode;
  style?: TextStyle;
}
export default function TextLink({ url, children, style }: ITextLinkProps) {
  return (
    <Text onPress={() => Linking.openURL(url)} style={[{ color: blixtTheme.link }, style]}>
      {children}
    </Text>
  );
}

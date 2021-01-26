import React, { ReactNode } from "react";
import { TextStyle } from "react-native";
import { Text } from "native-base";

export interface ITextLinkProps {
  children?: ReactNode;
  style?: TextStyle;
  onPress?: () => void;
}
export default function TextClickable({ onPress, children, style }: ITextLinkProps) {
  onPress = onPress ?? (() => {});

  return (
    <Text onPress={onPress} style={[{ color: "#4f9ca8" }, style]}>
      {children}
    </Text>
  );
}

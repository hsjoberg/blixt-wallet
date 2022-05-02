import React from "react";
import { NativeBase, Text } from "native-base";
import Clipboard from "@react-native-community/clipboard";

import { toast } from "../utils";

export interface ICopyTextProps extends NativeBase.Text {
  children?: string | null;
}
export default function CopyText(props: ICopyTextProps) {
  const onPress = () => {
    Clipboard.setString(props.children ?? "");
    toast("Copied to clipboard");
  }

  return (
    <Text onPress={onPress} {...props}></Text>
  );
};

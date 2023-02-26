import React from "react";
import { blixtTheme } from "../native-base-theme/variables/commonColor";
import {
  StyleSheet,
  TouchableHighlight,
  GestureResponderEvent,
  View,
  StyleProp,
  ViewStyle,
} from "react-native";
import QRCode from "react-native-qrcode-svg";

export interface IQrCodeProps {
  data: string;
  onPress?: (e: GestureResponderEvent) => void;
  size?: number;
  color?: string;
  border?: number;
  style?: StyleProp<ViewStyle>;
}
export default function QrCode({
  data,
  onPress,
  size,
  color,
  border,
  style: customStyle,
}: IQrCodeProps) {
  size = size ?? 300;
  border = border ?? 26;

  return (
    <TouchableHighlight activeOpacity={1} onPress={onPress}>
      <View style={customStyle}>
        <View style={[{ width: size + border, height: size + border }, style.qrCodeContainer]}>
          <QRCode value={data} backgroundColor="transparent" color={color} size={size} />
        </View>
      </View>
    </TouchableHighlight>
  );
}

const style = StyleSheet.create({
  qrCodeContainer: {
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: blixtTheme.light,
    margin: 4,
  },
});

import React from "react";
import { getStatusBarHeight } from "react-native-status-bar-height";
import { useNavigation } from "@react-navigation/native";
import { Icon } from "native-base";
import { ViewStyle } from "react-native";

interface IGoBackIcon {
  style?: ViewStyle;
}
export default function GoBackIcon({ style }: IGoBackIcon) {
  const navigation = useNavigation();
  return (
    <Icon
      type="Ionicons"
      name="ios-chevron-back-sharp"
      style={style}
      onPress={navigation.goBack}
    />
  );
}

import React from "react";
import { getStatusBarHeight } from "react-native-status-bar-height";
import { useNavigation } from "@react-navigation/native";
import { Icon } from "native-base";
import { View, TouchableWithoutFeedback, Text } from "react-native";

export default function GoBackIcon() {
  const navigation = useNavigation();

  // return (
  //   <TouchableWithoutFeedback
  //   hitSlop
  //   />
  // )


  return (
    <Icon
      type="Ionicons"
      name="ios-chevron-back-sharp"
      style={{
        top: getStatusBarHeight(false) + 8,
        left: 8,
        position: "absolute",
        padding: 9,
      }}
      onPress={() => navigation.goBack()}
    />
  );
}

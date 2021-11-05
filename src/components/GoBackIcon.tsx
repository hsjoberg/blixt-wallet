import React from "react";
import { getStatusBarHeight } from "react-native-status-bar-height";
import { useNavigation } from "@react-navigation/native";
import { Icon } from "native-base";

export default function GoBackIcon() {
  const navigation = useNavigation();
  return (
    <Icon
      type="Ionicons"
      name="ios-chevron-back-sharp"
      style={{
        paddingHorizontal: 20,
        marginLeft: -20,
        paddingVertical: 6,
        marginTop: -3,
        top: 0,
        left: 0,
        position: "absolute",
      }}
      onPress={navigation.goBack}
    />
  );
}

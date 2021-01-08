import React from "react";
import { TouchableNativeFeedback, View, } from "react-native";
import { TouchableWithoutFeedback } from "react-native-gesture-handler";
import { PLATFORM } from "../utils/constants";

export function NavigationButton({ children, onPress }: any) {
  if (PLATFORM === "android") {
    return (
      <TouchableNativeFeedback
        onPress={onPress}
        useForeground={TouchableNativeFeedback.canUseNativeForeground()}
        background={TouchableNativeFeedback.Ripple("rgba(255, 255, 255, .32)", true, 22.5)}
        hitSlop={{ top: 16, right: 16, bottom: 16, left: 16 }}
      >
        <View>
          {children}
        </View>
      </TouchableNativeFeedback>
    )
  }
  return (
    <TouchableWithoutFeedback
      onPress={onPress}
      hitSlop={{ top: 16, right: 16, bottom: 16, left: 16 }}
    >
      <View>
        {children}
      </View>
    </TouchableWithoutFeedback>
  )
}
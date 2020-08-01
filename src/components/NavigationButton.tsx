import React from "react";
import { TouchableNativeFeedback, View, } from "react-native";

export function NavigationButton({ children, onPress }: any) {
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
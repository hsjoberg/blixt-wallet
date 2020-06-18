import React, { useRef, useEffect } from "react";
import { Alert, Animated, Easing, View } from "react-native";
import { Icon } from "native-base";

const AnimatedIcon = Animated.createAnimatedComponent(Icon);

export interface ISpinnerProps {
  onPress?: () => void;
}
export default function Spinner({ onPress }: ISpinnerProps) {
  onPress = onPress ?? (() => {});
  const spinAnim = useRef(new Animated.Value(0)).current;

  const rotation = spinAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  const fading = spinAnim.interpolate({
    inputRange:  [0, 0.50, 0.75, 1],
    outputRange: [1, 0.15, 1, 1]
  });

  useEffect(() => {
    if (!spinAnim) {
      return;
    }

    Animated.loop(
      Animated.timing(spinAnim, {
        toValue: 1,
        duration: 2500,
        useNativeDriver: true,
        // easing: Easing.ease
        easing: Easing.linear,
      })
    ).start();
  }, [spinAnim]);


  return (
    <AnimatedIcon
      style={{
        // backgroundColor:"blue",
        // transform: [{ rotate: rotation}],
        marginTop: -1,
        width: 20,
        height: 29,
        fontSize: 29,
        opacity: fading,
      }}
      name="sync"
      onPress={onPress}
    />
  );
}
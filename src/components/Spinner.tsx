import React, { useEffect, useState } from "react";
import { Animated, Easing } from "react-native";
import { Icon } from "native-base";

const AnimatedIcon = Animated.createAnimatedComponent(Icon);

export interface ISpinnerProps {
  onPress?: () => void;
}
export default function Spinner({ onPress }: ISpinnerProps) {
  onPress = onPress ?? (() => {});
  const [spinAnim] = useState(() => new Animated.Value(0));

  const fading = spinAnim.interpolate({
    inputRange: [0, 0.5, 0.75, 1],
    outputRange: [1, 0.15, 1, 1],
  });

  useEffect(() => {
    Animated.loop(
      Animated.timing(spinAnim, {
        toValue: 1,
        duration: 2500,
        useNativeDriver: true,
        easing: Easing.linear,
      }),
    ).start();
  }, [spinAnim]);

  return (
    <AnimatedIcon
      style={{
        // marginRight: -1,
        // marginTop: -1,
        width: 30,
        height: 29,
        fontSize: 30,
        opacity: fading,
      }}
      type="MaterialIcons"
      name="sync"
      onPress={onPress}
    />
  );
}

import React from "react";
import { StyleSheet, Animated, Keyboard } from "react-native";
import { createAnimatableComponent } from "react-native-animatable";
import { Text } from "native-base";
import { Button } from "./Button";

import { blixtTheme } from "../native-base-theme/variables/commonColor";
import { PLATFORM } from "../utils/constants";

const AnimatedButton = createAnimatableComponent(Button);

export interface IMathPadProps {
  visible: boolean;
  onAddPress: () => void;
  onSubPress: () => void;
  onMulPress: () => void;
  onDivPress: () => void;
  onParenthesisLeftPress: () => void;
  onParenthesisRightPress: () => void;
  onEqualSignPress: () => void;
}
export function MathPad({
  visible,
  onAddPress,
  onSubPress,
  onMulPress,
  onDivPress,
  onParenthesisLeftPress,
  onParenthesisRightPress,
  onEqualSignPress,
}: IMathPadProps) {
  if (!visible) {
    return <></>;
  }

  return (
    <Animated.View
      pointerEvents={visible ? "auto" : "none"}
      style={{
        flexDirection: "row",
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: blixtTheme.gray,
        // overflow: "hidden",
        width: "100%",
        // height: visible ? 50 : 1, // https://github.com/facebook/react-native/issues/18415
        height: 50,
        opacity: visible ? 1 : 0,
        // opacity: 1,
        // position: "absolute",
        paddingLeft: -10,
        bottom: 0,
      }}
    >
      <AnimatedButton onPress={onAddPress} style={mathPadStyles.button}>
        <Text style={mathPadStyles.buttonText}>+</Text>
      </AnimatedButton>
      <AnimatedButton onPress={onSubPress} style={mathPadStyles.button}>
        <Text style={mathPadStyles.buttonText}>-</Text>
      </AnimatedButton>
      <AnimatedButton onPress={onMulPress} style={mathPadStyles.button}>
        <Text style={mathPadStyles.buttonText}>*</Text>
      </AnimatedButton>
      <AnimatedButton onPress={onDivPress} style={mathPadStyles.button}>
        <Text style={mathPadStyles.buttonText}>/</Text>
      </AnimatedButton>
      <AnimatedButton onPress={onParenthesisLeftPress} style={mathPadStyles.button}>
        <Text style={mathPadStyles.buttonText}>(</Text>
      </AnimatedButton>
      <AnimatedButton onPress={onParenthesisRightPress} style={mathPadStyles.button}>
        <Text style={mathPadStyles.buttonText}>)</Text>
      </AnimatedButton>
      <AnimatedButton onPress={onEqualSignPress} style={mathPadStyles.button}>
        <Text style={mathPadStyles.buttonText}>=</Text>
      </AnimatedButton>

      {PLATFORM === "ios" && (
        <AnimatedButton onPress={() => Keyboard.dismiss()} style={mathPadStyles.button}>
          <Text style={mathPadStyles.buttonText}>Done</Text>
        </AnimatedButton>
      )}
    </Animated.View>
  );
}

const mathPadStyles = StyleSheet.create({
  button: {
    marginBottom: 0,
    marginLeft: 5,
    marginRight: 5,
    height: PLATFORM === "android" ? 35 : 32,
    backgroundColor: blixtTheme.lightGray,
  },
  buttonText: {
    fontFamily: PLATFORM === "android" ? "monospace" : undefined,
    letterSpacing: 0,
    fontSize: PLATFORM === "android" ? undefined : 10,
  },
});

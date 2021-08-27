import React, { useState, useEffect, useRef } from "react";
import { View, Animated } from "react-native";
import { Text } from "native-base";
import { RouteProp } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import * as Animatable from "react-native-animatable";

import { SendStackParamList } from "./index";
import Svg, { Circle, Polyline } from "react-native-svg";
import { blixtTheme } from "../../native-base-theme/variables/commonColor";
import Container from "../../components/Container";

const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const AnimatedPolyline = Animated.createAnimatedComponent(Polyline);
const AnimatedText = Animatable.createAnimatableComponent(Text);

// https://codepen.io/ottodevs/pen/BMmdMM

function CheckmarkCircle() {
  const circleRadius = useRef(new Animated.Value(55)).current;

  useEffect(() => {
    Animated.spring(circleRadius, {
      toValue: 80,
      friction: 4.5,
      useNativeDriver: true,
    }).start();
  }, []);


  return (
    <AnimatedCircle
      cx="93"
      cy="95"
      r={circleRadius}
      fill={blixtTheme.green}
    />
  );
}

function CheckmarkPolyline() {
  const strokeWidth = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(strokeWidth, {
      toValue: 8,
      friction: 4,
      useNativeDriver: true,
    }).start();
  }, []);

  return (
    <AnimatedPolyline
      strokeWidth={strokeWidth}
      strokeDasharray={[100, 100]}
      strokeDashoffset={200}
      stroke="#fff"
      points="59.5,99.8 79.7,119.9 128.2,71.4"
      fill="transparent"
    />
  );
}


function Check() {
  return (
    <Svg width="185" height="185" style={{ backgroundColor: "transparent" }}>
      <CheckmarkCircle />
      <CheckmarkPolyline />
    </Svg>
  );
}

export function Done() {
  return (
    <>
      <Check />
      <AnimatedText
        style={{ marginTop: 12 }}
        duration={300}
        animation="fadeIn"
        useNativeDriver={true}
      >
        PAYMENT SENT
      </AnimatedText>
    </>
  )
}

export interface ISendConfirmationProps {
  navigation: StackNavigationProp<SendStackParamList, "SendDone">;
  route: RouteProp<SendStackParamList, "SendDone">;
}
export default function SendDone({
  navigation,
  route,
}: ISendConfirmationProps) {
  const callback = (route.params.callback) ?? (() => {});
  const preimage = route.params.preimage;

  useEffect(() => {
    setTimeout(() => {
      callback(preimage!);
      if (navigation.canGoBack()) {
        navigation.pop();
      }
    }, 1850);
  }, []);

  return (
    <Container style={{ justifyContent: "center", alignItems: "center" }}>
      <Done />
    </Container>
  );
}

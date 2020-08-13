import React, { useState, useEffect } from "react";
import { View, Animated } from "react-native";
import { Text } from "native-base";
import { RouteProp } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import * as Animatable from "react-native-animatable";

import { SendStackParamList } from "./index";
import Svg, { G, Circle, Polyline, PolylineProps } from "react-native-svg";
import { blixtTheme } from "../../../native-base-theme/variables/commonColor";
import Container from "../../components/Container";

const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const AnimatedPolyline = Animated.createAnimatedComponent(Polyline);

class CheckmarkCircle extends React.Component {
  constructor(props) {
    super(props);

    this.state = { circleRadius: new Animated.Value(55) };

    this.state.circleRadius.addListener((circleRadius) => {
      if (this._myCircle) {
        this._myCircle.setNativeProps({ r: circleRadius.value.toString() });
      }
    });

    setTimeout(() => {
      Animated.spring(this.state.circleRadius, {
        toValue: 80,
        friction: 4.5,
        useNativeDriver: true,
      }).start();
    }, 1);
  }

  render() {
    return (
      <AnimatedCircle
        ref={(ref) => (this._myCircle = ref)}
        cx="93"
        cy="95"
        r="45"
        fill={blixtTheme.green}
      />
    );
  }
}

// tslint:disable-next-line: max-classes-per-file
class CheckmarkPolyline extends React.Component {
  constructor(props) {
    super(props);

    this.state = { strokeWidth: new Animated.Value(0) };

    this.state.strokeWidth.addListener((strokeWidth) => {
      if (this._myPolyline) {
        this._myPolyline.setNativeProps({
          strokeWidth: strokeWidth.value.toString(),
        });
      }
    });

    setTimeout(() => {
      Animated.spring(this.state.strokeWidth, {
        toValue: 8,
        friction: 4,
        useNativeDriver: true,
      }).start();
    }, 5);
  }

  render() {
    // points="43.5,77.8 63.7,97.9 112.2,49.4"
    return (
      <AnimatedPolyline
        ref={(ref) => (this._myPolyline = ref)}
        strokeWidth={0}
        strokeDasharray={[100, 100]}
        strokeDashoffset={200}
        stroke="#fff"
        points="59.5,99.8 79.7,119.9 128.2,71.4"
      />
    );
  }
}

const AnimatedText = Animatable.createAnimatableComponent(Text);

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
      navigation.pop();
    }, 1850);
  }, []);

  return (
    <Container style={{ justifyContent: "center", alignItems: "center" }}>
      <Svg width="185" height="185" style={{ backgroundColor: "transparent" }}>
        <CheckmarkCircle />
        <CheckmarkPolyline />
      </Svg>
      <AnimatedText
        style={{ marginTop: 12 }}
        duration={300}
        animation="fadeIn"
        useNativeDriver={true}
      >
        PAYMENT SENT
      </AnimatedText>
    </Container>
  );
}

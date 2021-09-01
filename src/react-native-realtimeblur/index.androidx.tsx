import React from "react";
import RCTRealTimeBlur from "./RCTRealTimeBlur";
import { View, ViewProps } from "react-native";

interface IRealTimeBlurProps extends ViewProps {
  overlayColor?: string;
  blurRadius?: number;
  downsampleFactor?: number;
  children: any;
}
export default function RealTimeBlur(props: IRealTimeBlurProps) {
  return (
    <>
      <RCTRealTimeBlur
        {...props}
        children={null}
        style={[{ position:"absolute", width: "100%", height: "100%" }, props.style]}
      />
      <View style={{ flex: 1 }}>
        {props.children}
      </View>
    </>
  )
}

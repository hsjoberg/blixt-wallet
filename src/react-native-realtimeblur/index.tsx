import React from "react";
import { View, ViewProps } from "react-native";

interface IRealTimeBlurProps extends ViewProps {
  overlayColor?: string;
  blurRadius?: number;
  downsampleFactor?: number;
  children: any;
}
export default function RealTimeBlur(props: IRealTimeBlurProps) {
  return (
    <View
      {...props}
      style={[{ backgroundColor: "rgba(0.5, 0.5, 0.5, 0.75)", position: "absolute", width: "100%", height: "100%" }, props.style]}
    >
      <View style={{ flex: 1, justifyContent: "center" }}>
        {props.children}
      </View>
    </View>
  )
}

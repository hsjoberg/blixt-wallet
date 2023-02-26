import React from "react";
import LinearGradient from "react-native-linear-gradient";
import { blixtTheme } from "../native-base-theme/variables/commonColor";
import { Chain } from "../utils/build";
import Color from "color";

export default function BlixtHeader(props: any) {
  return (
    <LinearGradient
      style={[
        {
          position: "absolute",
          backgroundColor: blixtTheme.primary,
        },
        {
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          width: "100%",
          height: "100%",
        },
      ]}
      colors={
        Chain === "mainnet"
          ? [blixtTheme.secondary, blixtTheme.primary]
          : [blixtTheme.lightGray, Color(blixtTheme.lightGray).darken(0.3).hex()]
      }
    >
      {props?.children}
    </LinearGradient>
  );
}

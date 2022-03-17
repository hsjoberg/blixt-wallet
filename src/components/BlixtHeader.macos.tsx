import React from "react";
import { Animated } from "react-native";
import {Svg} from "react-native-svg";
import GradientPath from "react-native-svg-path-gradient";
import { blixtTheme } from "../native-base-theme/variables/commonColor";
// import { HEADER_MAX_HEIGHT } from "../windows/Overview";

class SvgHeader extends React.Component {
  render(): React.ReactNode {
    return (
      <Svg height={175} width="100%" viewBox={`0 0 1 50`} {...this.props} style={{position: "absolute"}}>
        <GradientPath
          d={`M0,0 0,50`}
          strokeWidth={10000}
          precision={1}
          colors={[blixtTheme.secondary, blixtTheme.primary]}
        />
        {this.props.children}
      </Svg>
    );
  }
}

export default Animated.createAnimatedComponent(SvgHeader);

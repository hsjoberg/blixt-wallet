import React, { useState } from "react";
import { StatusBar, StyleSheet } from "react-native";

import Camera from "../components/Camera";
import BarcodeMask from "../components/BarCodeMask";
import { smallScreen } from "../utils/device";
import { blixtTheme } from "../native-base-theme/variables/commonColor";
import GoBackIcon from "../components/GoBackIcon";
import { PLATFORM } from "../utils/constants";
import { getStatusBarHeight } from "react-native-status-bar-height";
import { StackNavigationProp } from "@react-navigation/stack";
import { RouteProp } from "@react-navigation/native";
import { RootStackParamList } from "../Main";

interface ICameraFullscreenProps {
  bolt11Invoice?: string;
  navigation: StackNavigationProp<RootStackParamList, "CameraFullScreen">;
  route: RouteProp<RootStackParamList, "CameraFullScreen">;
}

export default function CameraFullscreen({ navigation, route }: ICameraFullscreenProps) {
  const [onReadCalled, setOnReadCalled] = useState(false);
  const onRead = route.params.onRead ?? (() => {});
  return (
    <>
      <StatusBar
        backgroundColor="transparent"
        hidden={false}
        translucent={true}
        networkActivityIndicatorVisible={true}
        barStyle="light-content"
      />
      <Camera
        onRead={(data) => {
          if (!onReadCalled) {
            onRead(data);
            navigation.pop();
            setOnReadCalled(true);
          }
        }}
        onNotAuthorized={() => setTimeout(() => navigation.pop(), 1)}
      >
        <>
          <BarcodeMask
            showAnimatedLine={false}
            edgeColor={blixtTheme.primary}
            width={smallScreen ? 270 : 275}
            height={smallScreen ? 270 : 275}
          />
          {PLATFORM !== "android" && <GoBackIcon style={style.goBack} />}
        </>
      </Camera>
    </>
  );
}

const style = StyleSheet.create({
  goBack: {
    top: getStatusBarHeight(false) + 8,
    left: 8,
    position: "absolute",
    padding: 9,
  },
});

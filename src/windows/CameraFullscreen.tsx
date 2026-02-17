import React, { useRef, useState } from "react";
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
import { Container } from "native-base";

interface ICameraFullscreenProps {
  bolt11Invoice?: string;
  navigation: StackNavigationProp<RootStackParamList, "CameraFullscreen">;
  route: RouteProp<RootStackParamList, "CameraFullscreen">;
}

export default function CameraFullscreen({ navigation, route }: ICameraFullscreenProps) {
  const [cameraActive, setCameraActive] = useState(true);
  const onReadHandled = useRef(false);
  const onRead = route.params.onRead ?? (() => {});

  const closeScreen = () => {
    if (navigation.canGoBack()) {
      navigation.pop();
    }
  };

  return (
    <Container>
      <StatusBar
        backgroundColor="transparent"
        hidden={false}
        translucent={true}
        networkActivityIndicatorVisible={true}
        barStyle="light-content"
      />
      <Camera
        active={cameraActive}
        onRead={(data) => {
          if (onReadHandled.current || !data) {
            return;
          }

          onReadHandled.current = true;
          setCameraActive(false);
          onRead(data);
          closeScreen();
        }}
        onNotAuthorized={() => {
          setTimeout(() => closeScreen(), 1);
        }}
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
    </Container>
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

import React, { ReactNode, useState, useEffect } from "react";
import { StyleProp, ViewStyle, InteractionManager } from "react-native";
import { Camera } from "expo-camera";
import { BarCodeScanner } from "expo-barcode-scanner";
import Container from "./Container";
import { blixtTheme } from "../native-base-theme/variables/commonColor";

export interface ICamera {
  active?: boolean;
  children?: ReactNode | JSX.Element;
  cameraType?: "front" | "back";
  onRead?: (text: string) => void;
  onNotAuthorized?: () => void;
  style?: StyleProp<ViewStyle>;
}
export default function CameraComponent({ cameraType, children, onNotAuthorized, onRead, style, active }: ICamera) {
  const [start, setStart] = useState(false);
  active = active ?? true;

  useEffect(() => {
    InteractionManager.runAfterInteractions(() => {
      setStart(true);
    })
  }, []);

  if (!start || !active) {
    return (
      <Container style={{ backgroundColor: "black" }}>
        {children ?? <></>}
      </Container>
    );
  }

  return (
    <Camera
      style={[{ width: "100%", height: "100%", backgroundColor: blixtTheme.dark }, style]}
      barCodeScannerSettings={{
        barCodeTypes: [BarCodeScanner.Constants.BarCodeType.qr],
      }}
      onBarCodeScanned={(e) => {
        if (onRead) {
          onRead(e.data)
        }
      }}
      type={
        cameraType === Camera.Constants.Type.back
          ? Camera.Constants.Type.back
          : Camera.Constants.Type.front
      }
    >
      {children ?? <></>}
    </Camera>
  );
}
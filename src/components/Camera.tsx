import React, { ReactNode, useState, useEffect } from "react";
import { StyleProp, ViewStyle, InteractionManager, StyleSheet } from "react-native";
// import {
//   Camera,
//   useCodeScanner,
//   useCameraDevice,
//   useCameraPermission,
// } from "react-native-vision-camera";
import Container from "./Container";

export interface ICamera {
  active?: boolean;
  children?: ReactNode | JSX.Element;
  cameraType?: keyof CameraType; // TODO(hsjoberg)
  onRead?: (text: string) => void;
  onNotAuthorized?: () => void; // TODO(hsjoberg):
  style?: StyleProp<ViewStyle>;
}
export default function CameraComponent({
  children,
  onNotAuthorized,
  onRead,
  style,
  active,
}: ICamera) {
  const [start, setStart] = useState(true);
  const device = useCameraDevice("back");
  const { hasPermission, requestPermission } = useCameraPermission();
  const codeScanner = useCodeScanner({
    codeTypes: ["qr"],
    onCodeScanned: (codes) => {
      if (codes.length >= 0) {
        onRead?.(codes[0].value ?? "");
      }
    },
  });
  active = active ?? true;

  // useEffect(() => {
  //   InteractionManager.runAfterInteractions(() => {
  //     setStart(true);
  //   });
  // }, []);

  useEffect(() => {
    (async () => {
      if (hasPermission === false) {
        console.log("Does not have camera permission");
        if (await !requestPermission()) {
          // TODO fix await
          onNotAuthorized?.();
        }
      }
    })();
  }, [requestPermission, hasPermission]);

  if (!start || !active || !hasPermission || !device) {
    return <Container style={{ backgroundColor: "black" }}>{children ?? <></>}</Container>;
  }

  return (
    <>
      <Camera
        style={StyleSheet.absoluteFill}
        codeScanner={codeScanner}
        device={device}
        isActive={active}
      />
      {children}
    </>
  );
}

import React, { ReactNode, useState, useEffect } from "react";
import { StyleProp, ViewStyle, InteractionManager, StyleSheet } from "react-native";
import { Camera, CameraType } from "react-native-camera-kit";
import Container from "./Container";

export interface ICamera {
  active?: boolean;
  children?: ReactNode | JSX.Element;
  cameraType?: keyof CameraType;
  onRead?: (text: string) => void;
  onNotAuthorized?: () => void; // TODO(hsjoberg):
  style?: StyleProp<ViewStyle>;
}
export default function CameraComponent({
  cameraType,
  children,
  onNotAuthorized,
  onRead,
  style,
  active,
}: ICamera) {
  const [start, setStart] = useState(false);
  active = active ?? true;

  useEffect(() => {
    InteractionManager.runAfterInteractions(() => {
      setStart(true);
    });
  }, []);

  if (!start || !active) {
    return <Container style={{ backgroundColor: "black" }}>{children ?? <></>}</Container>;
  }

  return (
    <>
      <Camera
        style={[{ width: "100%", height: "100%" }, style]}
        scanBarcode={true}
        cameraType={cameraType}
        onReadCode={(event: any) => onRead?.(event.nativeEvent.codeStringValue)}
      />
      {children}
    </>
  );
}

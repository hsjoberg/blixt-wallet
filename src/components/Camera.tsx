import React, { ReactNode, useState, useEffect } from "react";
import { StyleProp, ViewStyle, InteractionManager } from "react-native";
// import { RNCamera, CameraType } from "react-native-camera";
import Container from "./Container";

export interface ICamera {
  active?: boolean;
  children?: ReactNode | JSX.Element;
  cameraType?: keyof CameraType;
  onRead?: (text: string) => void;
  onNotAuthorized?: () => void;
  style?: StyleProp<ViewStyle>;
}
export default function Camera({ cameraType, children, onNotAuthorized, onRead, style, active }: ICamera) {
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
    <RNCamera
      style={[{ width: "100%", height: "100%" }, style]}
      androidCameraPermissionOptions={{
        title: "Permission to use camera",
        message: "Permission to use the camera is needed to be able to scan QR codes",
        buttonPositive: "Okay",
      }}
      onBarCodeRead={(e) => onRead && onRead(e.data)}
      captureAudio={false}
      type={cameraType}
    >
      {({ status }) => {
        if (status === "NOT_AUTHORIZED" && onNotAuthorized) {
          onNotAuthorized();
        }
        return (children ?? <></>);
      }}
    </RNCamera>
  );
}

import React, { ReactNode, useState, useEffect } from "react";
import { StyleProp, ViewStyle, InteractionManager, StyleSheet } from "react-native";
import { Camera, CameraType } from "react-native-camera-kit";
import Container from "./Container";
import { PLATFORM } from "../utils/constants";

let ReactNativePermissions: any;
if (PLATFORM !== "macos") {
  ReactNativePermissions = require("react-native-permissions");
}

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
    InteractionManager.runAfterInteractions(async () => {
      const permission =
        PLATFORM === "ios"
          ? ReactNativePermissions.PERMISSIONS.IOS.CAMERA
          : ReactNativePermissions.PERMISSIONS.ANDROID.CAMERA;
      const result = await ReactNativePermissions.request(permission);

      if (result === "granted" || result === "limited") {
        console.log("Camera permission not granted");
        setStart(true);
      } else {
        console.log("Camera permission granted");
      }
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

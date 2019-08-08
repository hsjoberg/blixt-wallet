import React, { ReactNode } from "react";
import { StyleProp, ViewStyle } from "react-native";
import { RNCamera, CameraType } from "react-native-camera";

export interface ICamera {
  children?: ReactNode | JSX.Element;
  cameraType?: keyof CameraType;
  onRead?: (text: string) => void;
  onNotAuthorized?: () => void;
  style?: StyleProp<ViewStyle>;
}
export default ({ cameraType, children, onNotAuthorized, onRead, style }: ICamera) => (
  <RNCamera
    style={[{ width: "100%", height: "100%"}, style]}
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
      if (status === "NOT_AUTHORIZED") {
        onNotAuthorized && onNotAuthorized();
      }
      return (children || <></>);
    }}
  </RNCamera>
);
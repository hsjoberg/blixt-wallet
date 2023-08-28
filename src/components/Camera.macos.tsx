import React, { ReactNode } from "react";
import { StyleProp, ViewStyle } from "react-native";

export interface ICamera {
  active?: boolean;
  children?: ReactNode | JSX.Element;
  cameraType?: keyof unknown;
  onRead?: (text: string) => void;
  onNotAuthorized?: () => void; // TODO(hsjoberg):
  style?: StyleProp<ViewStyle>;
}
export default function CameraComponent({ cameraType, children, onNotAuthorized, onRead, style, active }: ICamera) {
  return <></>
}

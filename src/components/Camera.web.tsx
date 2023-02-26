import React, { ReactNode, useState, useEffect } from "react";
import { StyleProp, ViewStyle, InteractionManager, View } from "react-native";
import { QrReader } from "react-qr-reader";
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
    <View style={[{ width: "100%", height: "100%", backgroundColor: blixtTheme.dark }, style]}>
      <QrReader
        onResult={(result, error) => {
          if (!!result) {
            onRead?.(result?.text);
          }

          if (!!error) {
            console.info(error);
          }
        }}
        // style={{ width: "100%", height: "100%", backgroundColor: blixtTheme.dark }}
        constraints={{}}
        videoContainerStyle={{ position: undefined }}
      />
      {children ?? <></>}
    </View>
  );
}

import React, { useState } from "react";
import { StatusBar } from "react-native";
import Camera from "../components/Camera";

type onReadCallback = (address: string) => void;

export default function CameraFullscreen({ navigation, route }: any) {
  const [onReadCalled, setOnReadCalled] = useState(false);
  const onRead: onReadCallback = route.params.onRead ?? (() => {});
  return (
    <>
      <StatusBar
        hidden={false}
        translucent={false}
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
      />
    </>
  );
}

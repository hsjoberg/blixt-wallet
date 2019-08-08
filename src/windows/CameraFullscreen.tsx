import React, { useState } from "react";
import { StatusBar } from "react-native";
import { NavigationScreenProp } from "react-navigation";
import Camera from "../components/Camera";

type onReadCallback = (address: string) => void;

export interface ICameraFullscreenProps {
  navigation: NavigationScreenProp<{}>;
}
export default ({ navigation }: ICameraFullscreenProps) => {
  const [onReadCalled, setOnReadCalled] = useState(false);
  const onRead: onReadCallback = navigation.getParam("onRead") || (() => {});
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
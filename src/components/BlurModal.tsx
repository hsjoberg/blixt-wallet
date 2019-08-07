import React, { useEffect } from "react";
import { StyleSheet, TouchableOpacity } from "react-native";
import { View } from "react-native";
import { NavigationScreenProp } from "react-navigation";
import BlurOverlay, { closeOverlay, openOverlay } from "../Blur";

export interface ITransactionDetailsProps {
  navigation: NavigationScreenProp<{}>;
  children: any;
}
export default ({ navigation, children }: ITransactionDetailsProps) => {
  useEffect(() => {
    setTimeout(() => {
      openOverlay();
    }, 1);
  }, []);

  const goBack = () => {
    closeOverlay();
    setTimeout(() => navigation.pop(), 0);
  };

  return (
    <View style={style.container} touchSoundDisabled={true}>
      <BlurOverlay
        onPress={goBack}
        fadeDuration={200}
        radius={15}
        downsampling={2.07}
        brightness={0}
        customStyles={style.blurOverlay}
        blurStyle="dark"
      >
        <TouchableOpacity style={style.contentCanvas} activeOpacity={1} touchSoundDisabled={true}>
          {children}
        </TouchableOpacity>
      </BlurOverlay>
    </View>
  );
};

const style = StyleSheet.create({
  container: {
    position: "absolute",
    flex: 1,
    left: 0,
    top: 0,
    bottom: 0,
    right: 0,
  },
  blurOverlay: {
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  contentCanvas: {
    width: "88%",
  },
});

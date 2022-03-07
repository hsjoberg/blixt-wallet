import React from "react";
import { View, StyleSheet, Pressable, ViewStyle } from "react-native";
import { Icon } from "native-base";
import Modal from "react-native-modal";
import { getStatusBarHeight } from "react-native-status-bar-height";

import { useNavigation } from "@react-navigation/native";
import RealTimeBlur from "../react-native-realtimeblur";
import { PLATFORM } from "../utils/constants";

export interface ITransactionDetailsProps {
  children: any;
  useModalComponent?: boolean;
  goBackByClickingOutside?: boolean;
  noMargin?: boolean,
  style?: ViewStyle;
}
export default function BlurModal({ children, useModalComponent, goBackByClickingOutside, noMargin, style: userStyle }: ITransactionDetailsProps) {
  const navigation = useNavigation();
  const useModal = PLATFORM === "web" || PLATFORM === "macos" ? false : useModalComponent ?? true;
  goBackByClickingOutside = goBackByClickingOutside ?? true;
  noMargin = noMargin ?? false;

  const goBack = () => {
    if (goBackByClickingOutside) {
      navigation.goBack();
    }
  };

  return (
    <RealTimeBlur
      overlayColor="#00000000"
      downsampleFactor={1.2}
      blurRadius={15}
    >
      {!useModal
        ? <>
            <Pressable
              style={{
                position: "absolute",
                flex: 1,
                width: "100%",
                height: PLATFORM === "web" ? "100vh" : "100%",
              }}
              onPress={goBack}
            />
            <View style={[style.modal, userStyle]}>
              {children}
            </View>
          </>
        : <>
            <Modal
              onBackdropPress={goBack}
              onRequestClose={goBack}
              visible={true}
              style={userStyle}
            >
              {children}
            </Modal>
            {goBackByClickingOutside && <Icon onPress={() => navigation.goBack()} type="Entypo" name="cross" style={style.cross} />}
          </>
      }
    </RealTimeBlur>
  );
};

const style = StyleSheet.create({
  container: {
    position: "absolute",
    width: "100%",
    height: "100%",
    flex: 1,
    justifyContent: "center",

    // react-native-macos specific fixes
    maxWidth: PLATFORM === "ios" ? 650 : undefined,
    alignSelf: "center",
  },
  inner: {
    flex: 1,
    margin: 12,
    padding: 0,

    // react-native-macos specific fix
    justifyContent: "center",
  },
  modal: {
    marginHorizontal: 6,
  },
  cross: {
    position: "absolute",
    top: getStatusBarHeight() + 0,
    right: 10,
  }
});

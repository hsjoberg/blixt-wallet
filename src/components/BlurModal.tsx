import React, { useEffect, useState } from "react";
import { StyleSheet, TouchableOpacity } from "react-native";
import { View } from "react-native";
import Modal from "react-native-modal";
import BlurOverlay, { closeOverlay, openOverlay } from "../Blur";
import { useNavigation } from "@react-navigation/native";

export interface ITransactionDetailsProps {
  children: any;
  useModalComponent?: boolean;
}
export default function BlurModal({ children, useModalComponent }: ITransactionDetailsProps) {
  const navigation = useNavigation();
  const [modalVisible, setModalVisible] = useState(false);

  useEffect(() => {
    setTimeout(() => {
      openOverlay();
    }, 1);
    setModalVisible(true);

    return () => {
      setModalVisible(false)
    }
  }, []);

  const goBack = () => {
    closeOverlay();
    setTimeout(() => navigation.goBack(), 0);
    setModalVisible(false);
  };

  const useModal = useModalComponent ?? true;

  return (
    <View style={style.container} touchSoundDisabled={true}>
      <BlurOverlay
        onPress={goBack}
        fadeDuration={170}
        radius={15}
        downsampling={2.07}
        brightness={0}
        customStyles={style.blurOverlay}
        blurStyle="dark"
      >
        {!useModal
          ? children
          : <Modal
              onBackdropPress={goBack}
              onRequestClose={goBack}
              visible={true}
            >
              {children}
            </Modal>
        }
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
});

import React from "react";
import Modal from "react-native-modal";
import { useNavigation } from "@react-navigation/native";
import RealTimeBlur from "../react-native-realtimeblur";

export interface ITransactionDetailsProps {
  children: any;
  useModalComponent?: boolean;
}
export default function BlurModal({ children, useModalComponent }: ITransactionDetailsProps) {
  const navigation = useNavigation();
  const useModal = useModalComponent ?? true;

  const goBack = () => {
    navigation.goBack();
  };

  return (
    <RealTimeBlur
      overlayColor="#00000000"
      downsampleFactor={1.2}
      blurRadius={15}
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
    </RealTimeBlur>
  );
};
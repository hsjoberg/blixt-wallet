import React from "react";
import { View, StyleSheet, Pressable, ViewStyle } from "react-native";
import { useNavigation } from "@react-navigation/native";
import RealTimeBlur from "../react-native-realtimeblur";

export interface ITransactionDetailsProps {
  children: any;
  useModalComponent?: boolean;
  goBackByClickingOutside?: boolean;
  noMargin?: boolean;
  style?: ViewStyle;
}
export default function BlurModal({ children, useModalComponent, goBackByClickingOutside, noMargin, style: userStyle }: ITransactionDetailsProps) {
  const navigation = useNavigation();
  const useModal = useModalComponent ?? true;
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
      <Pressable
        style={{
          position: "absolute",
          flex: 1,
          width: "100%",
          height: "100vh",
        }}
        onPress={goBack}
      />
      <View style={[style.modal, userStyle]}>
        {children}
      </View>
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
  },
  inner: {
    margin: 12,
    padding: 0,
    justifyContent: "flex-start",
    flexDirection: "column",
  },
  modal: {
    marginHorizontal: 6,
  },
});

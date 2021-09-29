import React from "react";
import { StyleSheet } from "react-native";
import { H1, Text } from "native-base";

import Blurmodal from "../../components/BlurModal";
import { blixtTheme } from "../../native-base-theme/variables/commonColor";

export interface IWebInfoProps {
  navigation: any;
}
export default function WebInfo({ navigation }: IWebInfoProps) {
  return (
    <Blurmodal goBackByClickingOutside={true}>
      <H1 style={style.title} onPress={() => navigation.pop()}>
        Interactive demo
      </H1>
      <Text style={style.text} onPress={() => navigation.pop()} >
        Press to try out Blixt Wallet!
      </Text>
    </Blurmodal>
  );
};

const style = StyleSheet.create({
  title: {
    fontFamily: blixtTheme.fontMedium,
    textAlign: "center",
    paddingBottom: 4,
  },
  text: {
    textAlign: "center",
  }
});

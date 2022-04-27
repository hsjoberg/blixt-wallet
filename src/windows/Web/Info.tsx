import React from "react";
import { StyleSheet, View } from "react-native";
import { Button, H1, Text } from "native-base";

import Blurmodal from "../../components/BlurModal";
import { blixtTheme } from "../../native-base-theme/variables/commonColor";

import { useTranslation } from "react-i18next";
import { namespaces } from "../../i18n/i18n.constants";

export interface IWebInfoProps {
  navigation: any;
}
export default function WebInfo({ navigation }: IWebInfoProps) {
  const t = useTranslation(namespaces.web.info).t;

  return (
    <Blurmodal goBackByClickingOutside={true}>
      <H1 style={style.title} onPress={() => navigation.pop()}>
        {t("title")}
      </H1>
      <Text style={style.text} onPress={() => navigation.pop()}>
        {t("pressToTry")}
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

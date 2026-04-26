import React from "react";
import { StyleSheet, View } from "react-native";
import { H1, Text } from "native-base";
import { Button } from "../../components/Button";

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
    <Blurmodal goBackByClickingOutside={true} hideCross={true}>
      <H1 style={style.title} onPress={() => navigation.pop()}>
        {t("title")}
      </H1>
      <Text style={style.text} onPress={() => navigation.pop()}>
        {t("pressToTry")}
      </Text>
      <View style={{flexDirection: "row", justifyContent: "center", marginTop: 14 }}>
        <Button small onPress={() => navigation.pop()}>
          <Text>Continue</Text>
        </Button>
      </View>
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

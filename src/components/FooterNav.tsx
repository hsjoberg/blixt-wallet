import React from "react";
import { Footer, FooterTab, Icon, Text } from "native-base";
import { Button } from "./Button";
import { useNavigation, NavigationProp } from "@react-navigation/core";

import { useTranslation } from "react-i18next";
import { namespaces } from "../i18n/i18n.constants";
import { RootStackParamList } from "../Main";

export default function FooterNav() {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const t = useTranslation(namespaces.footerNav).t;

  return (
    <Footer>
      <FooterTab>
        <Button testID="FOOTER_RECEIVE" onPress={() => navigation.navigate("Receive")}>
          {<Icon type="AntDesign" name="qrcode" />}
          <Text>{t("receive")}</Text>
        </Button>
      </FooterTab>
      <FooterTab>
        <Button testID="FOOTER_SEND" onPress={() => navigation.navigate("Send")}>
          <Icon type="AntDesign" name="camerao" />
          <Text>{t("send")}</Text>
        </Button>
      </FooterTab>
    </Footer>
  );
}

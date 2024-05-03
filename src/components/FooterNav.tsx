import React from "react";
import { Button, Footer, FooterTab, Icon, Text } from "native-base";
import { useNavigation } from "@react-navigation/native";

import { useTranslation } from "react-i18next";
import { namespaces } from "../i18n/i18n.constants";

export default function FooterNav() {
  const navigation = useNavigation();
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
        <Button
          testID="FOOTER_SEND"
          onPress={() =>
            navigation.navigate("Send", { screen: "SendCameraKit", params: { viaSwipe: false } })
          }
          onLongPress={() => {
            navigation.navigate("Send", { screen: "SendCameraKit", params: { viaSwipe: false } });
          }}
        >
          <Icon type="AntDesign" name="camerao" />
          <Text>{t("send")}</Text>
        </Button>
      </FooterTab>
    </Footer>
  );
}

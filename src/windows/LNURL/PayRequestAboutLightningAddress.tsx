import React from "react";
import { StyleSheet } from "react-native";
import { Body, Card, Text, CardItem, H1 } from "native-base";

import Blurmodal from "../../components/BlurModal";
import TextLink from "../../components/TextLink";

import { useTranslation, TFunction } from "react-i18next";
import { namespaces } from "../../i18n/i18n.constants";

let t:TFunction;

export default function PayRequestAboutLightningAddress() {
  t = useTranslation(namespaces.LNURL.LNURLPayRequest).t;
  return (
    <Blurmodal>
      <Card style={style.card}>
        <CardItem>
          <Body>
            <H1 style={style.header}>{t("title")}</H1>
            <Text style={style.textBlock}>
              <TextLink url="https://lightningaddress.com">{t("msg1")}</TextLink>{" "}
              {t("msg2")}
            </Text>
            <Text style={style.textBlock}>
              {t("msg3")}
            </Text>
            <Text style={style.textBlock}>
              {t("msg4")}{" "}
              {t("msg5")}
            </Text>
          </Body>
        </CardItem>
      </Card>
    </Blurmodal>
  );
};

const style = StyleSheet.create({
  card: {
    padding: 5,
    width: "100%",
    minHeight: "30%"
  },
  header: {
    width: "100%",
    fontWeight: "bold",
    marginBottom: 8,
  },
  detailText: {
    marginBottom: 7,
  },
  textBlock: {
    marginBottom: 16,
  },
  textBold: {
    fontWeight: "bold",
  }
});


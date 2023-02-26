import React from "react";
import { StyleSheet } from "react-native";
import { Body, Card, Text, CardItem, H1 } from "native-base";

import Blurmodal from "../../components/BlurModal";
import TextLink from "../../components/TextLink";

import { useTranslation } from "react-i18next";
import { namespaces } from "../../i18n/i18n.constants";

export interface IDunderLspInfoProps {
  navigation: any;
}
export default function DunderLspInfo({ route }: any) {
  const t = useTranslation(namespaces.receive.dunderLspInfo).t;
  return (
    <Blurmodal>
      <Card style={style.card}>
        <CardItem>
          <Body>
            <H1 style={style.header}>{t("title")}</H1>
            <Text style={{ marginBottom: 16 }}>{t("msg")}</Text>
            <Text style={{ marginBottom: 16 }}>{t("msg1")}</Text>
            <Text style={{ marginBottom: 16 }}>{t("msg2")}</Text>
            <Text style={{ marginBottom: 16 }}>
              {t("msg3")}{" "}
              <TextLink url="https://github.com/hsjoberg/dunder-lsp">{t("msg4")}</TextLink>{" "}
              {t("msg5")}
            </Text>
          </Body>
        </CardItem>
      </Card>
    </Blurmodal>
  );
}

const style = StyleSheet.create({
  card: {
    padding: 5,
    width: "100%",
    minHeight: "20%",
  },
  header: {
    fontWeight: "bold",
    marginBottom: 10,
  },
  detailText: {
    marginBottom: 7,
  },
  qrText: {
    marginBottom: 7,
    paddingTop: 4,
    paddingLeft: 18,
    paddingRight: 18,
  },
});

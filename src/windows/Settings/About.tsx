import React from "react";
import { StyleSheet, ScrollView } from "react-native";
import { Body, Card, Text, CardItem, H1 } from "native-base";

import Blurmodal from "../../components/BlurModal";
import { VersionName, VersionCode, ApplicationId, IsHermes } from "../../utils/build";
import { useStoreState } from "../../state/store";
import TextLink from "../../components/TextLink";
import { HAMPUS_EMAIL, GITHUB_REPO_URL } from "../../utils/constants";

import { useTranslation } from "react-i18next";
import { namespaces } from "../../i18n/i18n.constants";

const software = [
  "lnd with Neutrino",
  "react-native",
  "easy-peasy",
  "react-native-camera",
  "react-native-navigation",
];

export default function About() {
  const t = useTranslation(namespaces.settings.about).t;
  const appVersion = useStoreState((store) => store.appVersion);

  return (
    <Blurmodal>
      <Card style={style.card}>
        <CardItem>
          <Body>
            <ScrollView>
              <H1 style={style.header}>{t("title")}</H1>
              <Text style={style.textBlock}>
                {t("msg1")} {VersionName} ({appVersion}/{VersionCode}) {ApplicationId}
                {"\n"}
                {t("msg2")} <TextLink url={HAMPUS_EMAIL}>Hampus Sjöberg</TextLink>
              </Text>
              <Text style={style.textBlock}>
                {t("msg3")}
                {"\n"}
                <TextLink url={GITHUB_REPO_URL}>{GITHUB_REPO_URL}</TextLink>
              </Text>
              <Text style={style.textBlock}>
                <Text style={style.textBold}>
                  {t("msg4")}:{"\n"}
                </Text>
                {software.join("\n")}
                {IsHermes && "\nHermes"}
                {"\n"}... {t("msg5")}.
              </Text>
              <Text>
                {t("msg6")}{" "}
                <TextLink url="https://www.iconfinder.com/iconfinder">IconFinder</TextLink> (
                <TextLink url="https://creativecommons.org/licenses/by/3.0/">{t("msg7")}</TextLink>)
              </Text>
            </ScrollView>
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
    minHeight: "55%",
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
    marginBottom: 8,
  },
  textBold: {
    fontWeight: "bold",
  },
});

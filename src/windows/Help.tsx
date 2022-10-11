import React from "react";
import { StyleSheet, Linking } from "react-native";
import { Body, Card, Text, CardItem, H1, Toast, View, Button } from "native-base";

import Blurmodal from "../components/BlurModal";
import { GITHUB_REPO_URL, HAMPUS_EMAIL, TELEGRAM, FAQ } from "../utils/constants";

import { useTranslation } from "react-i18next";
import { namespaces } from "../i18n/i18n.constants";


export interface ISyncInfoProps {
  navigation: any;
}
export default function SyncInfo({ route }: any) {
  const { t, i18n } = useTranslation(namespaces.help)
  const onPressGithub = async () => {
    await Linking.openURL(GITHUB_REPO_URL);
  };

  const onPressEmail = async () => {
    await Linking.openURL(HAMPUS_EMAIL);
  }

  const onPressTelegram = async () => {
    await Linking.openURL(TELEGRAM);
  }

  const onPressFAQ = async () => {
    await Linking.openURL(FAQ);
  }

  return (
    <Blurmodal>
      <Card style={style.card}>
        <CardItem style={{ flexGrow: 1 }}>
          <Body>
            <H1 style={style.header}>
              {t("title")}
            </H1>
            <Text style={{ marginBottom: 14 }}>
              {t("msg1")}
            </Text>
            <Text style={{ marginBottom: 14 }}>
              {t("msg2")}
            </Text>
            <Text style={{ marginBottom: 28 }}>
              {t("msg3")}
            </Text>
            <View style={style.actionBar}>
              <Button style={style.actionBarButton} onPress={onPressGithub} small={true}>
                <Text style={style.actionBarButtonText}>GitHub</Text>
              </Button>
              <Button style={style.actionBarButton} onPress={onPressTelegram} small={true}>
                <Text style={style.actionBarButtonText}>{t("telegramGroup")}</Text>
              </Button>
              <Button style={style.actionBarButton} onPress={onPressEmail} small={true}>
                <Text style={style.actionBarButtonText}>Email</Text>
              </Button>
              <Button style={style.actionBarButton} onPress={onPressFAQ} small={true}>
                <Text style={style.actionBarButtonText}>FAQ</Text>
              </Button>
            </View>
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
  },
  header: {
    fontWeight: "bold",
    marginBottom: 10,
  },
  actionBar: {
    width: "100%",
    marginTop: 10,
    flexGrow: 1,
    alignItems: "flex-end",
    flexDirection: "row-reverse",
    flexWrap: "wrap-reverse",
  },
  actionBarButton: {
    marginLeft: 10,
    marginTop: 10,
  },
  actionBarButtonText: {
    fontSize: 9.75,
  }
});

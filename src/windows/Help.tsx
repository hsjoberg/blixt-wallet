import React from "react";
import { StyleSheet, Linking } from "react-native";
import Clipboard from "@react-native-community/react-native-clipboard";
import { Body, Card, Text, CardItem, H1, Toast, View, Button } from "native-base";
import { useStoreState } from "../state/store";

import Blurmodal from "../components/BlurModal";
import { GITHUB_REPO_URL, HAMPUS_EMAIL, TELEGRAM } from "../utils/constants";

export interface ISyncInfoProps {
  navigation: any;
}
export default function SyncInfo({ route }: any) {
  const onPressGithub = async () => {
    await Linking.openURL(GITHUB_REPO_URL);
  };

  const onPressEmail = async () => {
    await Linking.openURL(HAMPUS_EMAIL);
  }

  const onPressTelegram = async () => {
    await Linking.openURL(TELEGRAM);
  }

  return (
    <Blurmodal>
      <Card style={style.card}>
        <CardItem style={{ flexGrow: 1 }}>
          <Body>
            <H1 style={style.header}>
              Help
            </H1>
            <Text style={{ marginBottom: 14 }}>
              If you run into problems or have feedback, you can contact Blixt Wallet developers by filing an issue on Github or by contacting us via email.
            </Text>
            <Text style={{ marginBottom: 28 }}>
              As Blixt Wallet is a new wallet, we need feedback on common issues that users might face.
            </Text>
            <View style={style.actionBar}>
              <Button style={style.actionBarButton} onPress={onPressGithub} small={true} >
                <Text style={style.actionBarButtonText}>GitHub</Text>
              </Button>
              <Button style={style.actionBarButton} onPress={onPressTelegram} small={true} >
                <Text style={style.actionBarButtonText}>Telegram group</Text>
              </Button>
              <Button style={style.actionBarButton} onPress={onPressEmail} small={true} >
                <Text style={style.actionBarButtonText}>Email</Text>
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
    minHeight: "45%",
  },
  header: {
    fontWeight: "bold",
    marginBottom: 10,
  },
  actionBar: {
    width: "100%",
    flexGrow: 1,
    alignItems:"flex-end",
    flexDirection: "row-reverse",
  },
  actionBarButton: {
    marginLeft: 10,
  },
  actionBarButtonText: {
    fontSize: 9.75,
  }
});

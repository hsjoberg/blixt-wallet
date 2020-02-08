import React from "react";
import { StyleSheet, Linking, ScrollView } from "react-native";
import { Body, Card, Text, CardItem, H1 } from "native-base";

import Blurmodal from "../../components/BlurModal";
import { VersionName, ApplicationId, IsHermes } from "../../utils/build";
import { useStoreState } from "../../state/store.ts";

const GITHUB_REPO_URL = "https://github.com/hsjoberg/blixt-wallet";
const HAMPUS_EMAIL = "mailto:hampus.sjoberg💩protonmail.com";
const software = [
  "lnd with Neutrino",
  "react-native",
  "easy-peasy",
  "react-native-camera",
  "react-native-navigation",
]

export default () => {
  const appVersion = useStoreState((store) => store.appVersion);
  const onGithubLinkPress = () => Linking.openURL(GITHUB_REPO_URL)
  const onHampusLinkPress = () => Linking.openURL(HAMPUS_EMAIL.replace("💩", "@"));

  return (
    <Blurmodal>
      <Card style={style.card}>
        <CardItem>
          <Body>
            <ScrollView>
              <H1 style={style.header}>About Blixt Wallet</H1>
              <Text style={style.textBlock}>Version {VersionName} ({appVersion}) {ApplicationId}{IsHermes ? " Hermes" : ""}{"\n"}
              By <Text style={style.textLink} onPress={onHampusLinkPress}>Hampus Sjöberg</Text>
              </Text>
              <Text style={style.textBlock}>Open-source wallet with MIT license{"\n"}
                <Text style={style.textLink} onPress={onGithubLinkPress}>{GITHUB_REPO_URL}</Text>
              </Text>
              <Text style={style.textBlock}>
                <Text style={style.textBold}>Created using:{"\n"}</Text>
                {software.join("\n")}
                {"\n"}... and other amazing open source software.
              </Text>
            </ScrollView>
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
  textLink: {
    color: "#4f9ca8",
  },
  textBold : {
    fontWeight: "bold",
  }
});


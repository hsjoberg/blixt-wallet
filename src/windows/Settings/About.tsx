import React from "react";
import { StyleSheet, Linking, ScrollView } from "react-native";
import { Body, Card, Text, CardItem, H1 } from "native-base";

import Blurmodal from "../../components/BlurModal";
import { VersionName, VersionCode, ApplicationId, IsHermes } from "../../utils/build";
import { useStoreState } from "../../state/store";
import TextLink from "../../components/TextLink";
import { HAMPUS_EMAIL, GITHUB_REPO_URL } from "../../utils/constants";

const software = [
  "lnd with Neutrino",
  "react-native",
  "easy-peasy",
  "react-native-camera",
  "react-native-navigation",
];

export default function About() {
  const appVersion = useStoreState((store) => store.appVersion);

  return (
    <Blurmodal>
      <Card style={style.card}>
        <CardItem>
          <Body>
            <ScrollView>
              <H1 style={style.header}>About Blixt Wallet</H1>
              <Text style={style.textBlock}>Version {VersionName} ({appVersion}/{VersionCode}) {ApplicationId}{"\n"}
              By <TextLink url={HAMPUS_EMAIL}>Hampus Sjöberg</TextLink>
              </Text>
              <Text style={style.textBlock}>Open-source wallet with MIT license{"\n"}
                <TextLink url={GITHUB_REPO_URL}>{GITHUB_REPO_URL}</TextLink>
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
  textBold: {
    fontWeight: "bold",
  }
});


import React from "react";
import { StyleSheet } from "react-native";
import { Body, Card, Text, CardItem, H1 } from "native-base";

import Blurmodal from "../../components/BlurModal";
import TextLink from "../../components/TextLink";

export default function PayRequestAboutLightningAddress() {
  return (
    <Blurmodal>
      <Card style={style.card}>
        <CardItem>
          <Body>
            <H1 style={style.header}>About Lightning Address</H1>
            <Text style={style.textBlock}>
              <TextLink url="https://lightningaddress.com">Lightning Address</TextLink>{" "}
              is a way of paying a person or a service on the Lightning Network.
            </Text>
            <Text style={style.textBlock}>
              They look like email addresses, but instead of sending an email to the recipient, you're sending money.
            </Text>
            <Text style={style.textBlock}>
              Blixt Wallet has full support for sending to a Lightning Address, but receiving{" "}
              via a Lightning Address is still being worked on.
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


import React from "react";
import { StyleSheet } from "react-native";
import { Body, Card, Text, CardItem, H1 } from "native-base";

import Blurmodal from "../../components/BlurModal";
import TextLink from "../../components/TextLink";

export interface IDunderLspInfoProps {
  navigation: any;
}
export default function DunderLspInfo({ route }: any) {
  return (
    <Blurmodal>
      <Card style={style.card}>
        <CardItem>
          <Body>
            <H1 style={style.header}>
              About Dunder LSP
            </H1>
            <Text style={{ marginBottom: 16 }}>
              Dunder is a Lightning Service Provider (LSP) that automatically opens channels for you
              when you you want to receive a Lightning payment but don't have any inbound liquidity.
            </Text>
            <Text style={{ marginBottom: 16 }}>
              This could for example be the case when you first start using Blixt Wallet.
            </Text>
            <Text style={{ marginBottom: 16 }}>
              As this requires an on-chain transaction, a Bitcoin transaction fee will be deducted from the
              incoming payment. Future payments will be able to use the newly opened payment channel
              using the Lightning network.
            </Text>
            <Text style={{ marginBottom: 16 }}>
              Dunder is <TextLink url="https://github.com/hsjoberg/dunder-lsp">open-source</TextLink>
              {" "}software and you may change the default service provider in Settings.
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
  }
});

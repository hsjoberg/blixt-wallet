import React, { useState } from "react";
import { StyleSheet, View, ScrollView, Clipboard } from "react-native";
import { Body, Text, Header, Container, Left, Button, Title, Right, Icon, H1, H3, Fab, Card, CardItem, Toast, Root } from "native-base";
import { Row } from "react-native-easy-grid";
import { NavigationScreenProp } from "react-navigation";
import { newAddress } from "../lightning";

import * as QRCode from "qrcode";
import SvgUri from "react-native-svg-uri";

interface IOnChainProps {
  navigation: NavigationScreenProp<{}>;
}
export default ({ navigation }: IOnChainProps) => {
  const [address, setAddress]  = useState<string | undefined>(undefined);

  return (
    <Root>
      <Container>
        <Header iosBarStyle="light-content">
          <Left>
            <Button transparent={true} onPress={() => navigation.navigate("Main")}>
              <Icon name="arrow-back" />
            </Button>
          </Left>
          <Body>
            <Title>Lightning Network</Title>
          </Body>
        </Header>
        <ScrollView contentContainerStyle={style.container}>
          <Button
            onPress={async () => {
              const response = await newAddress();
              setAddress(response.address);
            }}
          ><Text>Generate address</Text></Button>

          {address &&
            <>
              <SvgUri
                width={330}
                height={330}
                svgXmlData={(QRCode as any).toString(address.toUpperCase())._55}
              />
              <Text onPress={() => {
                Clipboard.setString(address);
                Toast.show({
                  text: "Copied to clipboard.",
                  type: "warning",
                });
              }}>{address}</Text>
            </>
          }
        </ScrollView>
      </Container>
    </Root>
  );
};

const style = StyleSheet.create({
  container: {
    padding: 16,
  },
});

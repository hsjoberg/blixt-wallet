import React, { useState, useRef } from "react";
import { View, Touchable, TouchableHighlight, Share, Clipboard, Alert, StatusBar } from "react-native";
import { Button, Body, Container, Icon, Header, Text, Title, Left, Content, Form, Item, Label, Input, H1, H3, Toast, Root } from "native-base";

import * as QRCode from "qrcode";
import SvgUri from "react-native-svg-uri";
import { NavigationScreenProp } from "react-navigation";

const lnInvoice = "lnbc1pvjluezpp5qqqsyqcyq5rqwzqfqqqsyqcyq5rqwzqfqqqsyqcyq5rqwzqfqypqdpl2pkx2ctnv5sxxmmwwd5kgetjypeh2ursdae8g6twvus8g6rfwvs8qun0dfjkxaq8rkx3yf5tcsyz3d73gafnh3cax9rn449d9p5uxz9ezhhypd0elx87sjle52x86fux2ypatgddc6k63n7erqz25le42c4u4ecky03ylcqca784w"

const qr = QRCode.toString(lnInvoice);

interface IReceiveProps {
  onGoBackCallback: () => void;
  navigation: NavigationScreenProp<{}>;
}

type State = "FORM" | "QR";

export default ({ onGoBackCallback, navigation }: IReceiveProps) => {
  console.log(navigation);
  const [state, setState] = useState<State>("FORM");
  const [btcValue, setBtcValue] = useState<string | undefined>(undefined);
  const [dollarValue, setDollarValue] = useState<string | undefined>(undefined);

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
            <Title>Receive</Title>
          </Body>
        </Header>
        {state === "FORM" &&
          <Content style={{width: "100%", height: "100%", flex: 1 }}>
            <View style={{ padding: 24 }}>
              <Item style={{ marginTop: 8 }}>
                <Label>Amount ₿</Label>
                <Input
                  onChangeText={(text) => {
                    text = text.replace(/,/g, ".");
                    if (text.length === 0) {
                      setBtcValue(undefined);
                      setDollarValue(undefined);
                      return;
                    }
                    setBtcValue(text);
                    setDollarValue((Number.parseFloat(text) * 5083).toFixed(2).toString());
                  }}
                  placeholder="0.00000000 (optional)"
                  value={btcValue !== undefined ? btcValue.toString() : undefined}
                  keyboardType="numeric"
                />
              </Item>
              <Item style={{ marginTop: 16 }}>
                <Label>Amount $</Label>
                <Input
                  onChangeText={(text) => {
                    text = text.replace(/,/g, ".");
                    if (text.length === 0) {
                      setBtcValue(undefined);
                      setDollarValue(undefined);
                      return;
                    }
                    setBtcValue((Number.parseFloat(text) / 5083).toFixed(8).toString());
                    setDollarValue(text);
                  }}
                  placeholder="0.00 (optional)"
                  value={dollarValue !== undefined ? dollarValue.toString() : undefined}
                  keyboardType="numeric"
                />
              </Item>
              <Item style={{ marginTop: 16 }}>
                <Label>Message</Label>
                <Input placeholder="Message to payer (optional)" />
              </Item>
              <Item bordered={false} style={{ marginTop: 16 }}>
                <Button
                  style={{ width: "100%" }}
                  block={true}
                  success={true}
                  onPress={() => setState("QR")}>
                    <Text>Create invoice</Text>
                </Button>
              </Item>
            </View>
          </Content>
        }
        {state === "QR" &&
          <View style={{
            flex: 1,
            justifyContent: "center",
            alignItems: "center",
            width: "100%",
            height: "100%",
            marginTop: -16,
          }}>
            <H1 style={{ paddingBottom: 4 }}>Scan this QR code</H1>
            <Text note={true}>Expires: 1h</Text>
            <TouchableHighlight
              onPress={async () => {
                const result = await Share.share({
                  // message: lnInvoice,
                  url: "lightning:" + lnInvoice,
                });
              }}>
                <SvgUri
                  width={330}
                  height={330}
                  svgXmlData={qr._55}
                />
            </TouchableHighlight>
            <Text
              onPress={() => {
                Clipboard.setString(lnInvoice);
                Toast.show({
                  text: "Copied to clipboard.",
                  type: "warning",
                });
              }}
              style={{ paddingLeft: 18, paddingRight: 18, paddingBottom: 20 }}
              numberOfLines={1}
              lineBreakMode="middle"
              note={true}>
                {lnInvoice}
            </Text>
            <H3>100 sat</H3>
          </View>
        }
      </Container>
    </Root>
  );
};

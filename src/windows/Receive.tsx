import React, { useState, useEffect } from "react";
import { View, TouchableHighlight, Share, Clipboard } from "react-native";
import { Button, Body, Container, Icon, Header, Text, Title, Left, Input, H1, H3, Toast } from "native-base";

import * as QRCode from "qrcode";
import SvgUri from "react-native-svg-uri";
import { NavigationScreenProp, createSwitchNavigator } from "react-navigation";
import { useStoreActions, useStoreState } from "../state/store";
import { IAddInvoiceResponse } from "../lightning";

import { formatDistanceStrict, fromUnixTime } from "date-fns";
import { blixtTheme } from "../../native-base-theme/variables/commonColor";

import BlixtForm from "../components/Form";

interface IReceiveProps {
  navigation: NavigationScreenProp<{}>;
}

const BTCSAT = 100000000;
const BTCUSD = 8525;

export const ReceiveSetup = ({ navigation }: IReceiveProps) => {
  const addInvoice = useStoreActions((store) => store.receive.addInvoice);
  const [btcValue, setBtcValue] = useState<string | undefined>(undefined);
  const [satValue, setSatValue] = useState<string | undefined>(undefined);
  const [dollarValue, setDollarValue] = useState<string | undefined>(undefined);
  const [description, setDescription] = useState<string>("");

  const onChangeSatInput = (text: string) => {
    text = text.replace(/\D+/g, "");
    setSatValue(text);
    setDollarValue(((Number.parseInt(text || "0", 10) / BTCSAT) * BTCUSD).toFixed(2).toString());
  };

  const onChangeFiatInput = (text: string) => {
    text = text.replace(/,/g, ".");
    if (text.length === 0) {
      setBtcValue(undefined);
      setDollarValue(undefined);
      return;
    }
    setBtcValue((Number.parseFloat(text) / 5083).toFixed(8).toString());
    setSatValue(Math.floor(Number.parseFloat(text) / BTCUSD * BTCSAT).toString());
    setDollarValue(text);
  };

  const onCreateInvoiceClick = async () => {
    navigation.navigate("ReceiveQr", {
      invoice: await addInvoice({
        sat: Number.parseInt(satValue || "0", 10),
        description,
      })
    });
  };

  const formItems = [{
    key: "AMOUNT_SAT",
    title: "Amount sat",
    component: (
      <Input
        onChangeText={onChangeSatInput}
        placeholder="1000 (optional)"
        value={satValue !== undefined ? satValue.toString() : undefined}
        keyboardType="numeric"
      />
    ),
  }, {
    key: "AMOUNT_FIAT",
    title: "Amount $",
    component: (
      <Input
        onChangeText={onChangeFiatInput}
        placeholder="0.00 (optional)"
        value={dollarValue !== undefined ? dollarValue.toString() : undefined}
        keyboardType="numeric"
      />
    ),
  }, {
    key: "MESSAGE",
    title: "Message",
    component: (
      <Input
        onChangeText={setDescription}
        placeholder="Message to payer (optional)"
        value={description}
      />
    ),
  }];

  return (
    <Container>
      <Header iosBarStyle="light-content" translucent={false}>
        <Left>
          <Button transparent={true} onPress={() => navigation.navigate("Main")}>
            <Icon name="arrow-back" />
          </Button>
        </Left>
        <Body>
          <Title>Receive</Title>
        </Body>
      </Header>
      <BlixtForm
        items={formItems}
        buttons={[
          <Button
            key="CREATE_INVOICE"
            style={{ width: "100%" }}
            block={true}
            primary={true}
            onPress={onCreateInvoiceClick}
          >
            <Text>Create invoice</Text>
          </Button>
        ]}
      />
    </Container>
  );
};

export const ReceiveQr = ({ navigation }: IReceiveProps) => {
  const invoice: IAddInvoiceResponse = navigation.getParam("invoice");
  const transaction =
    useStoreState((store) => store.transaction.transactions.find((tx) => tx.paymentRequest === invoice.paymentRequest));

  if (!transaction) {
    return (
      <Container>
        <Header iosBarStyle="light-content" translucent={false}>
          <Left>
            <Button transparent={true}>
              <Icon name="arrow-back" />
            </Button>
          </Left>
          <Body>
            <Title>Receive</Title>
          </Body>
        </Header>
      </Container>
    );
  }

  if (transaction.status === "SETTLED") {
    console.log("Status settled");
    setTimeout(() => navigation.pop(), 1);
  }

  const bolt11payReq: string = (QRCode as any).toString(transaction.paymentRequest.toUpperCase())._55;

  const Ticker = ({ expire }: { expire: number; }) => {
    const [display, setDisplay] = useState(formatDistanceStrict(new Date(), fromUnixTime(expire)));

    useEffect(() => {
      const interval = setInterval(() => {
        setDisplay(
          formatDistanceStrict(new Date(), fromUnixTime(expire))
        );
      }, 1000);

      return () => clearInterval(interval);
    }, [expire]);

    return (<>{display}</>);
  };

  const onPressPaymentRequest = () => {
    Clipboard.setString(transaction.paymentRequest);
    Toast.show({
      text: "Copied to clipboard.",
      type: "warning",
    });
  };

  return (
    <Container>
      <Header iosBarStyle="light-content" translucent={false}>
        <Left>
          <Button transparent={true} onPress={() => navigation.pop()}>
            <Icon name="arrow-back" />
          </Button>
        </Left>
        <Body>
          <Title>Receive</Title>
        </Body>
      </Header>
      <View style={{
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        width: "100%",
        height: "100%",
        marginTop: -16,
      }}>
        <H1>Scan this QR code</H1>
        <Text style={{ marginBottom: 6 }}>
          <>Expires in </>
          <Ticker
            expire={transaction.expire}
          />
        </Text>
        <TouchableHighlight
          onPress={async () => {
            await Share.share({
              // message: lnInvoice,
              url: "lightning:" + bolt11payReq,
            });
          }}>
            <SvgUri
              width={340}
              height={340}
              svgXmlData={bolt11payReq}
              fill={blixtTheme.light}
            />
        </TouchableHighlight>
        <Text
          onPress={onPressPaymentRequest}
          style={{ paddingTop: 6, paddingLeft: 18, paddingRight: 18, paddingBottom: 20 }}
          numberOfLines={1}
          lineBreakMode="middle"
        >
          {transaction.paymentRequest}
        </Text>
        <H3>{transaction.value} sat</H3>
      </View>
    </Container>
  );
};

export default createSwitchNavigator({
  ReceiveSetup,
  ReceiveQr,
}, {
  initialRouteName: "ReceiveSetup",
});

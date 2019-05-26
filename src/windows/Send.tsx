import React, { useState } from "react";
import { View, StyleSheet, Alert, CheckBox, StatusBar} from "react-native";
import { Button, Container, Content, Icon, Item, Label, Text, Header, Left, Title, Body, Input, Spinner, Right } from "native-base";
import { RNCamera, CameraType } from "react-native-camera";
import * as Bech32 from "bech32";

import { useActions } from "../state/store";

interface ISendProps {
  onGoBackCallback: () => void;
  doneCallback: (transactionInfo: any) => void;
  bolt11Invoice?: string;
}

type State = "CAMERA" | "CONFIRMATION";

export default ({ onGoBackCallback, doneCallback }: ISendProps) => {
  const sendPayment = useActions((actions) => actions.lightning.sendPayment);
  const decodePaymentRequest = useActions((actions) => actions.lightning.decodePaymentRequest);
  const [state, setState] = useState<State>("CAMERA");
  // Camera
  const [bolt11Invoice, setBolt11Invoice] = useState<string | undefined>(undefined);
  const [cameraType, setCameraType] =
    useState<CameraType["back"] | CameraType["front"]>(RNCamera.Constants.Type.back);
  const [scanning, setScanning] = useState(true);
  // Send
  const [isPaying, setIsPaying] = useState(false);
  const [feeCap, setFeeCap] = useState(true);
  const [invoiceInfo, setInvoiceInfo] = useState<any>(undefined);

  if (state === "CAMERA") {
    return (
      <View>
        <StatusBar
          hidden={false}
          backgroundColor="#000"
          animated={true}
          translucent={false}
        />
        <RNCamera
          style={{ width: "100%", height: "100%" }}
          type={cameraType}
          permissionDialogTitle={"Permission to use camera"}
          permissionDialogMessage={"Permission to use the camera is needed to be able to scan QR codes"}
          onBarCodeRead={async ({ data }) => {
            if (!scanning) {
              return;
            }
            data = data.replace(/^lightning:/, "");
            try {
              const decodedBech32 = Bech32.decode(data, 1024);
              if (decodedBech32.prefix.slice(0, 4) !== "lnbc" && decodedBech32.prefix.slice(0, 4) !== "lntb") {
                setScanning(false);
                Alert.alert(`QR code is not a valid Bitcoin Lightning invoice`, undefined,
                  [{text: "OK", onPress: () => setScanning(true) }]);
                return;
              }
              setBolt11Invoice(data);
              setInvoiceInfo(await decodePaymentRequest({ bolt11: data }));
              setState("CONFIRMATION");
            }
            catch (e) {
              setScanning(false);
              console.log(e);
              Alert.alert(`QR code is not a valid Lightning invoice`, undefined,
                [{ text: "OK", onPress: () => setScanning(true) }]);
            }
          }}
          captureAudio={false}
        >
          <View style={StyleSheet.absoluteFill}>
            <Icon
              type="Ionicons"
              name="md-swap"
              onPress={() => {
                if (cameraType === RNCamera.Constants.Type.front) {
                  setCameraType(RNCamera.Constants.Type.back);
                }
                else if (cameraType === RNCamera.Constants.Type.back) {
                  setCameraType(RNCamera.Constants.Type.front);
                }
              }}
              style={{
                position: "absolute",
                fontSize: 26,
                color: "#DDD",
                padding: 4,
                bottom: 8,
                left: 8,
              }}
            />
            <Icon
              type="FontAwesome"
              name="paste"
              onPress={async () => {
                const bolt11 = "lntb12u1pww4ckdpp5xck8m9yerr9hqufyd6p0pp0pwjv5nqn6guwr9qf4l66wrqv3h2ssdp2xys9xct5da3kx6twv9kk7m3qg3hkccm9ypxxzar5v5cqp5ynhgvxfnkwxx75pcxcq2gye7m5dj26hjglqmhkz8rljhg3eg4hfyg38gnsynty3pdatjg9wpa7pe7g794y0hxk2gqd0hzg2hn5hlulqqen6cr5";
                setBolt11Invoice(bolt11);
                setInvoiceInfo(await decodePaymentRequest({ bolt11 }));
                setState("CONFIRMATION");
              }}
              style={{
                position: "absolute",
                fontSize: 26,
                color: "#DDD",
                padding: 4,
                bottom: 8,
                right: 8,
              }}
            />
          </View>
        </RNCamera>
      </View>
    );
  }
  else if (state === "CONFIRMATION") {
    if (!bolt11Invoice || !invoiceInfo) {
      return (<Text>Unknown error</Text>);
    }

    return (
      <Container>
        <Header>
          <Left>
            <Button transparent={true} onPress={onGoBackCallback}>
              <Icon name="arrow-back" />
            </Button>
          </Left>
          <Body>
            <Title>Confirm pay invoice</Title>
          </Body>
        </Header>
        <Content style={{width: "100%", height: "100%" }} contentContainerStyle={{ height: "100%", flex:1, display: "flex", justifyContent: "space-between" }}>
          <View style={{
            padding: 24,
          }}>
            <Item success={true} style={{ marginTop: 8 }}>
              <Label>Invoice</Label>
              <Input style={{ fontSize: 13, marginTop: 4 }} disabled={true} value={`${bolt11Invoice.substring(0, 33).toLowerCase()}...`} />
              <Icon name="checkmark-circle" />
            </Item>
            <Item style={{ marginTop: 16 }}>
              <Label>Amount ₿</Label>
              <Input disabled={true} value={formatSatToBtc(invoiceInfo.numSatoshis).toString()} />
            </Item>
            <Item style={{ marginTop: 16 }}>
              <Label>Amount SEK</Label>
              <Input disabled={true} value={convertSatToFiat(invoiceInfo.numSatoshis).toString()} />
            </Item>
            <Item style={{ marginTop: 16 }}>
              <Label>Message</Label>
              <Input style={{ fontSize: 13, marginTop: 4 }} disabled={true} value={invoiceInfo.description} />
            </Item>
            <Item style={{ marginTop: 16 }}>
              <Label>Cap fees at 3%</Label>
              <Right>
                <CheckBox onValueChange={(value) => setFeeCap(value)} value={feeCap} />
              </Right>
            </Item>
          </View>
          <View style={{
            padding: 24,
          }}>
            <Item bordered={false} style={{
              marginBottom: 4,
              alignSelf: "flex-end",
            }}>
              <Button
                disabled={isPaying}
                style={{ width: "100%" }}
                block={true}
                success={true}
                onPress={async () => {
                  setIsPaying(true);
                  const s = await sendPayment({ paymentRequest: bolt11Invoice });
                  doneCallback({});
                }}>
                {!isPaying && <Text>Pay</Text>}
                {isPaying && <Spinner color="white" />}
              </Button>
            </Item>
          </View>
        </Content>
      </Container>
    );
  }
  else {
    return (
      <Text>Unknown state</Text>
    );
  }
};

function formatSatToBtc(sat: number) {
  return sat / 100000000;
}

function convertSatToFiat(sat: number) {
  return Number.parseFloat(((sat / 100000000) * 76270).toFixed(2));
}

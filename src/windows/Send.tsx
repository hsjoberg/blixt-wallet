import React, { useState } from "react";
import { View, StyleSheet, Alert, CheckBox, StatusBar, TouchableOpacity } from "react-native";
import { Button, Container, Content, Icon, Item, Label, Text, Header, Left, Title, Body, Input, Spinner, Right, Toast, Root } from "native-base";
import { RNCamera, CameraType } from "react-native-camera";
import * as Bech32 from "bech32";

import { useActions } from "../state/store";
import { NavigationScreenProp, createSwitchNavigator } from "react-navigation";

interface ISendProps {
  onGoBackCallback: () => void;
  doneCallback: (transactionInfo: any) => void;
  bolt11Invoice?: string;
  navigation: NavigationScreenProp<{}>;
}
export const SendCamera = ({ navigation }: ISendProps) => {
  const decodePaymentRequest = useActions((actions) => actions.lightning.decodePaymentRequest);

  const [cameraType, setCameraType] =
    useState<CameraType["back"] | CameraType["front"]>(RNCamera.Constants.Type.back);
  const [scanning, setScanning] = useState(true);

  return (
    <View>
      <StatusBar
        backgroundColor="transparent"
        hidden={false}
        translucent={true}
        networkActivityIndicatorVisible={true}
        barStyle="light-content"
      />
      <RNCamera
        style={{ width: "100%", height: "100%" }}
        type={cameraType}
        androidCameraPermissionOptions={{
          title: "Permission to use camera",
          message: "Permission to use the camera is needed to be able to scan QR codes",
          buttonPositive: "Okay",
        }}
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

            navigation.navigate("SendConfirmation", {
              invoiceInfo: await decodePaymentRequest({ bolt11: data }),
              bolt11Invoice: data,
            });
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
        {({ status }) => {
          if (status === "NOT_AUTHORIZED") {
            setTimeout(() => navigation.navigate("Main"), 1);
          }
          else {
            return (
              <View style={StyleSheet.absoluteFill}>
                <Icon
                  type="Ionicons" name="md-swap" style={sendStyle.swapCamera}
                  onPress={() => {
                    setCameraType(
                      cameraType === RNCamera.Constants.Type.front
                        ? RNCamera.Constants.Type.back
                        : RNCamera.Constants.Type.front
                    );
                  }}
                />
                <Icon
                  type="FontAwesome" name="paste" style={sendStyle.paste}
                  onPress={async () => {
                    const bolt11 = "lntb12u1pww4ckdpp5xck8m9yerr9hqufyd6p0pp0pwjv5nqn6guwr9qf4l66wrqv3h2ssdp2xys9xct5da3kx6twv9kk7m3qg3hkccm9ypxxzar5v5cqp5ynhgvxfnkwxx75pcxcq2gye7m5dj26hjglqmhkz8rljhg3eg4hfyg38gnsynty3pdatjg9wpa7pe7g794y0hxk2gqd0hzg2hn5hlulqqen6cr5";
                    navigation.navigate("SendConfirmation", {
                      invoiceInfo: await decodePaymentRequest({ bolt11 }),
                      bolt11Invoice: bolt11,
                    });
                  }}
                />
              </View>
            );
          }
        }}
      </RNCamera>
    </View>
  );
};

export const SendConfirmation = ({ navigation }: ISendProps) => {
  const sendPayment = useActions((actions) => actions.lightning.sendPayment);
  const getBalance = useActions((actions) => actions.lightning.getBalance);

  const [isPaying, setIsPaying] = useState(false);
  const [feeCap, setFeeCap] = useState(true);
  const bolt11Invoice = navigation.getParam("bolt11Invoice");
  const invoiceInfo = navigation.getParam("invoiceInfo");

  return (
    <Root>
      <Container>
        <StatusBar
          hidden={false}
          translucent={false}
          networkActivityIndicatorVisible={false}
        />
        <Header iosBarStyle="light-content">
          <Left>
            <Button transparent={true} onPress={() => navigation.navigate("SendCamera")}>
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
              <Input editable={false} style={{ fontSize: 13, marginTop: 4 }} value={`${bolt11Invoice.substring(0, 33).toLowerCase()}...`} />
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
                  try {
                    setIsPaying(true);
                    const s = await sendPayment({ paymentRequest: bolt11Invoice });
                    await getBalance();
                    navigation.navigate("Main");
                  } catch (e) {
                    console.log(e);
                    Toast.show({
                      duration: 10000,
                      type: "danger",
                      text: `Error: ${e.status.description}`,
                      buttonText: "Okay",
                    });
                    setIsPaying(false);
                  }
                }}>
                {!isPaying && <Text>Pay</Text>}
                {isPaying && <Spinner color="white" />}
              </Button>
            </Item>
          </View>
        </Content>
      </Container>
    </Root>
  );
};

const sendStyle = StyleSheet.create({
  swapCamera: {
    position: "absolute",
    fontSize: 26,
    color: "#DDD",
    padding: 4,
    bottom: 8,
    left: 8,
  },
  paste: {
    position: "absolute",
    fontSize: 26,
    color: "#DDD",
    padding: 4,
    bottom: 8,
    right: 8,
  },
});

function formatSatToBtc(sat: number) {
  return sat / 100000000;
}

function convertSatToFiat(sat: number) {
  return Number.parseFloat(((sat / 100000000) * 76270).toFixed(2));
}

export default createSwitchNavigator({
  SendCamera,
  SendConfirmation,
}, {
  initialRouteName: "SendCamera",
  // transitionConfig : () => ({
  //   transitionSpec: {
  //     duration: 0,
  //     timing: Animated.timing,
  //     easing: Easing.step0,
  //   },
  // }),
  // mode: "modal",
  // headerMode: "none",
});

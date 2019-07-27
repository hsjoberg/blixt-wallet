import React, { useState } from "react";
import { View, StyleSheet, Alert, CheckBox, StatusBar, Clipboard } from "react-native";
import { Button, Container, Content, Icon, Item, Label, Text, Header, Left, Title, Body, Input, Spinner, Right, Toast, Root } from "native-base";
import { RNCamera, CameraType } from "react-native-camera";
import * as Bech32 from "bech32";

import { useStoreActions } from "../state/store";
import { NavigationScreenProp, createSwitchNavigator } from "react-navigation";
import { blixtTheme } from "../../native-base-theme/variables/commonColor";
import { lnrpc } from "../../proto/proto";

interface ISendProps {
  onGoBackCallback: () => void;
  doneCallback: (transactionInfo: any) => void;
  bolt11Invoice?: string;
  navigation: NavigationScreenProp<{}>;
}
export const SendCamera = ({ navigation }: ISendProps) => {
  const decodePaymentRequest = useStoreActions((actions) => actions.lightning.decodePaymentRequest);

  const [cameraType, setCameraType] =
    useState<CameraType["back"] | CameraType["front"]>(RNCamera.Constants.Type.back);
  const [scanning, setScanning] = useState(true);


  const onCameraSwitchClick = () => {
    setCameraType(
      cameraType === RNCamera.Constants.Type.front
        ? RNCamera.Constants.Type.back
        : RNCamera.Constants.Type.front
    );
  };

  const onPasteClick = async () => {
    try {
      const bolt11 = (await Clipboard.getString()).replace(/^lightning:/, "");
      navigation.navigate("SendConfirmation", {
        invoiceInfo: await decodePaymentRequest({ bolt11 }),
        bolt11Invoice: bolt11,
      });
    }
     catch (e) {
       console.log(e);
       Alert.alert(`Not a valid Lightning invoice`, undefined,
         [{ text: "OK", onPress: () => setScanning(true) }]);
     }
  };

  const onDebugPaste = async () => {
    const bolt11 = "lntb12u1pww4ckdpp5xck8m9yerr9hqufyd6p0pp0pwjv5nqn6guwr9qf4l66wrqv3h2ssdp2xys9xct5da3kx6twv9kk7m3qg3hkccm9ypxxzar5v5cqp5ynhgvxfnkwxx75pcxcq2gye7m5dj26hjglqmhkz8rljhg3eg4hfyg38gnsynty3pdatjg9wpa7pe7g794y0hxk2gqd0hzg2hn5hlulqqen6cr5";
    navigation.navigate("SendConfirmation", {
      invoiceInfo: await decodePaymentRequest({ bolt11 }),
      bolt11Invoice: bolt11,
    });
  };

  const onBarCodeRead = async ({ data }: { data: string }) => {
    if (!scanning) {
      return;
    }
    data = data.replace(/^lightning:/, "");
    if (!checkBech32(data, "lntb")) {
      setScanning(false);
      Alert.alert(`QR code is not a valid Bitcoin Lightning invoice`, undefined,
        [{text: "OK", onPress: () => setScanning(true) }]);
      return;
    }
    try {
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
  };

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
        onBarCodeRead={onBarCodeRead}
        captureAudio={false}
      >
        {({ status }) => {
          if (status === "NOT_AUTHORIZED") {
            setTimeout(() => navigation.pop(), 1);
            return (<></>);
          }
          return (
            <View style={StyleSheet.absoluteFill}>
              <Icon type="Ionicons" name="md-swap" style={sendStyle.swapCamera} onPress={onCameraSwitchClick} />
              <Icon type="MaterialCommunityIcons" name="debug-step-over" style={{... sendStyle.paste, right: 64}} onPress={onDebugPaste} />
              <Icon type="FontAwesome" name="paste" style={sendStyle.paste} onPress={onPasteClick} />
            </View>
          );
        }}
      </RNCamera>
    </View>
  );
};

export const SendConfirmation = ({ navigation }: ISendProps) => {
  const sendPayment = useStoreActions((actions) => actions.lightning.sendPayment);
  const getBalance = useStoreActions((actions) => actions.lightning.getBalance);
  const syncTransaction = useStoreActions((actions) => actions.transaction.syncTransaction);

  const [isPaying, setIsPaying] = useState(false);
  // const [feeCap, setFeeCap] = useState(true);
  const bolt11Invoice = navigation.getParam("bolt11Invoice");

  const invoiceInfo: lnrpc.PayReq = navigation.getParam("invoiceInfo");

  const send = async () => {
    try {
      setIsPaying(true);
      const s = await sendPayment({
        paymentRequest: bolt11Invoice,
        invoiceInfo,
      });
      await getBalance(undefined);
      navigation.pop();
    } catch (e) {
      console.log(e);
      let error;
      if (e.status && e.status.description) { error = e.status.description; }
      else if (e.message) { error = e.message; }
      else { error = e; }

      Toast.show({
        duration: 12000,
        type: "danger",
        text: `Error: ${error}`,
        buttonText: "Okay",
      });
      setIsPaying(false);
    }
  };

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
        <Content style={{width: "100%", height: "100%" }} contentContainerStyle={sendStyle.transactionDetails}>
          <View>
            <Item success={true} style={{ marginTop: 8 }}>
              <Label style={{ width: 110 }}>Invoice</Label>
              <Input
                editable={false}
                style={{ fontSize: 13, marginTop: 4 }}
                value={`${bolt11Invoice.substring(0, 26).toLowerCase()}...`}
              />
              <Icon name="checkmark-circle" />
            </Item>
            <Item style={{ marginTop: 16 }}>
              <Label style={{ width: 110 }}>Amount ₿</Label>
              <Input disabled={true} value={formatSatToBtc(invoiceInfo.numSatoshis).toString()} />
            </Item>
            <Item style={{ marginTop: 16 }}>
              <Label style={{ width: 110 }}>Amount SEK</Label>
              <Input disabled={true} value={convertSatToFiat(invoiceInfo.numSatoshis).toString()} />
            </Item>
            <Item style={{ marginTop: 16 }}>
              <Label style={{ width: 110 }}>Message</Label>
              <Input style={{ fontSize: 13, marginTop: 4 }} disabled={true} value={invoiceInfo.description} />
            </Item>
            {/* <Item style={{ marginTop: 16 }}>
              <Label>Cap fees at 3%</Label>
              <Right>
                <CheckBox onValueChange={(value) => setFeeCap(value)} value={feeCap} />
              </Right>
            </Item> */}
          </View>
          <View>
            <View style={{
              marginBottom: 2,
            }}>
              <Button
                disabled={isPaying}
                style={{ width: "100%" }}
                block={true}
                primary={true}
                onPress={send}>
                {!isPaying && <Text>Pay</Text>}
                {isPaying && <Spinner color={blixtTheme.light} />}
              </Button>
            </View>
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
    color: blixtTheme.light,
    padding: 4,
    bottom: 8,
    left: 8,
  },
  paste: {
    position: "absolute",
    fontSize: 26,
    color: blixtTheme.light,
    padding: 4,
    bottom: 8,
    right: 8,
  },
  transactionDetails: {
    height: "100%",
    flex: 1,
    display: "flex",
    justifyContent: "space-between",
    padding: 24,
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

const checkBech32 = (bech32: string, prefix: string): boolean => {
  const decodedBech32 = Bech32.decode(bech32, 1024);
  if (decodedBech32.prefix.slice(0, prefix.length).toUpperCase() !== prefix.toUpperCase()) {
    return false;
  }
  return true;
};

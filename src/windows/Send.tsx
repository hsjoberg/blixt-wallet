import React, { useState } from "react";
import { View, StyleSheet, Alert, CheckBox, StatusBar, Clipboard } from "react-native";
import { Button, Container, Content, Icon, Item, Label, Text, Header, Left, Title, Body, Input, Spinner, Right, Toast } from "native-base";
import { RNCamera, CameraType } from "react-native-camera";
import * as Bech32 from "bech32";

import { useStoreActions, useStoreState } from "../state/store";
import { NavigationScreenProp, createSwitchNavigator } from "react-navigation";
import { blixtTheme } from "../../native-base-theme/variables/commonColor";
import { lnrpc } from "../../proto/proto";
import { getNodeInfo } from "../lndmobile";
import BlixtForm from "../components/Form";

interface ISendProps {
  onGoBackCallback: () => void;
  doneCallback: (transactionInfo: any) => void;
  bolt11Invoice?: string;
  navigation: NavigationScreenProp<{}>;
}
export const SendCamera = ({ navigation }: ISendProps) => {
  const setPayment = useStoreActions((store) => store.send.setPayment);

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

  const tryInvoice = async (paymentRequest: string, errorPrefix: string) => {
    if (!scanning) {
      return;
    }

    try {
      setScanning(false);
      await setPayment({ paymentRequestStr: paymentRequest });
      navigation.navigate("SendConfirmation");
    } catch (error) {
      Alert.alert(`${errorPrefix}: ${error.message}`, undefined,
        [{text: "OK", onPress: () => setScanning(true)}]);
    }
  };

  const onPasteClick = async () => {
    await tryInvoice(await Clipboard.getString(), "Clipboard paste error");
  };

  const onDebugPaste = async () => {
    const bolt11testnet = "lntb12u1pww4ckdpp5xck8m9yerr9hqufyd6p0pp0pwjv5nqn6guwr9qf4l66wrqv3h2ssdp2xys9xct5da3kx6twv9kk7m3qg3hkccm9ypxxzar5v5cqp5ynhgvxfnkwxx75pcxcq2gye7m5dj26hjglqmhkz8rljhg3eg4hfyg38gnsynty3pdatjg9wpa7pe7g794y0hxk2gqd0hzg2hn5hlulqqen6cr5";
    const bolt11mainnet = "lnbc1500n1pw5gmyxpp5tnx03hfr3tx2lx3aal045c5dycjsah6j6a80c27qmxla3nrk8xmsdp42fjkzep6ypxxjemgw3hxjmn8yptkset9dssx7e3qgehhyar4dejs6cqzpgxqr23s49gpc74nkm8em70rehny2fgkp94vwm6lh8ympp668x2asn8yf5vk76camftzte4nh3h8sf365vwx69mxp4x5p3s7jx8l57vaeqyr68gqx9eaf0";
    await tryInvoice(bolt11testnet, "Debug clipboard paste error");
  };

  const onBarCodeRead = async ({ data }: { data: string }) => {
    await tryInvoice(data, "QR scan error");
  };

  return (
    <>
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
              <Icon type="MaterialCommunityIcons" name="debug-step-over" style={sendStyle.pasteDebug} onPress={onDebugPaste} />
              <Icon type="FontAwesome" name="paste" style={sendStyle.paste} onPress={onPasteClick} />
            </View>
          );
        }}
      </RNCamera>
    </>
  );
};

export const SendConfirmation = ({ navigation }: ISendProps) => {
  const sendPayment = useStoreActions((actions) => actions.send.sendPayment);
  const getBalance = useStoreActions((actions) => actions.lightning.getBalance);

  const nodeInfo = useStoreState((store) => store.send.remoteNodeInfo);
  const paymentRequest = useStoreState((store) => store.send.paymentRequest);
  const bolt11Invoice = useStoreState((store) => store.send.paymentRequestStr);

  const [isPaying, setIsPaying] = useState(false);

  const send = async () => {
    try {
      setIsPaying(true);
      await sendPayment(undefined);
      await getBalance(undefined);
      navigation.pop();
    } catch (e) {
      console.log(e);

      Toast.show({
        duration: 12000,
        type: "danger",
        text: `Error: ${e.message}`,
        buttonText: "Okay",
      });
      setIsPaying(false);
    }
  };

  const formItems = [];

  formItems.push({
    key: "INVOICE",
    title: "Invoice",
    success: true,
    component: (
      <>
        <Input
          editable={false}
          style={{ fontSize: 13, marginTop: 4 }}
          value={`${bolt11Invoice.substring(0, 26).toLowerCase()}...`}
        />
        <Icon name="checkmark-circle" />
      </>
    ),
  });

  formItems.push({
    key: "AMOUNT_BTC",
    title: "Amount ₿",
    component: (<Input disabled={true} value={formatSatToBtc(paymentRequest.numSatoshis).toString()} />),
  });

  formItems.push({
    key: "AMOUNT_FIAT",
    title: "Amount SEK",
    component: (<Input disabled={true} value={convertSatToFiat(paymentRequest.numSatoshis).toString()} />),
  });

  if (nodeInfo !== undefined && nodeInfo.node !== undefined) {
    formItems.push({
      key: "RECIPIENT",
      title: "Recipient",
      component: (<Input style={{ fontSize: 13, marginTop: 4 }} disabled={true} value={nodeInfo.node.alias} />),
    });
  }

  formItems.push({
    key: "MESSAGE",
    title: "Message",
    component: (<Input style={{ fontSize: 13, marginTop: 4 }} disabled={true} value={paymentRequest.description} />),
  });

  return (
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
      <BlixtForm
        items={formItems}
        buttons={[(
            <Button
              key="PAY"
              disabled={isPaying}
              style={{ width: "100%" }}
              block={true}
              primary={true}
              onPress={send}>
              {!isPaying && <Text>Pay</Text>}
              {isPaying && <Spinner color={blixtTheme.light} />}
            </Button>
          ),
        ]}
      />
    </Container>
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
  pasteDebug: {
    position: "absolute",
    fontSize: 26,
    color: blixtTheme.light,
    padding: 4,
    bottom: 8,
    right: 64,
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

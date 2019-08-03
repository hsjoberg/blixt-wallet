import React, { useState } from "react";
import { View, StyleSheet, Alert, StatusBar, Clipboard } from "react-native";
import { Icon } from "native-base";
import { RNCamera, CameraType } from "react-native-camera";

import { useStoreActions } from "../../state/store";
import { NavigationScreenProp } from "react-navigation";
import { blixtTheme } from "../../../native-base-theme/variables/commonColor";

interface ISendCameraProps {
  onGoBackCallback: () => void;
  doneCallback: (transactionInfo: any) => void;
  bolt11Invoice?: string;
  navigation: NavigationScreenProp<{}>;
}
export default ({ navigation }: ISendCameraProps) => {
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

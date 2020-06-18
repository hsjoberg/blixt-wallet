import React, { useState } from "react";
import { View, StyleSheet, Alert, StatusBar } from "react-native";
import Clipboard from "@react-native-community/react-native-clipboard";
import { Icon } from "native-base";
import { RNCamera, CameraType } from "react-native-camera";
import { StackNavigationProp } from "@react-navigation/stack";

import BarcodeMask from "../../components/BarCodeMask";
import { SendStackParamList } from "./index";
import { useStoreActions, useStoreState } from "../../state/store";
import { blixtTheme } from "../../../native-base-theme/variables/commonColor";
import Camera from "../../components/Camera";
import { Chain } from "../../utils/build";
import { smallScreen } from "../../utils/device";

interface ISendCameraProps {
  bolt11Invoice?: string;
  navigation: StackNavigationProp<SendStackParamList, "SendCamera">;
}
export default function SendCamera({ navigation }: ISendCameraProps) {
  const rpcReady = useStoreState((store) => store.lightning.rpcReady);
  const setPayment = useStoreActions((store) => store.send.setPayment);
  const [cameraType, setCameraType] = useState<keyof CameraType>(RNCamera.Constants.Type.back);
  const [scanning, setScanning] = useState(true);
  const setLNURL = useStoreActions((store) => store.lnUrl.setLNUrl)
  const lnurlClear = useStoreActions((store) => store.lnUrl.clear)

  const onCameraSwitchClick = () => {
    setCameraType(
      cameraType === RNCamera.Constants.Type.front
        ? RNCamera.Constants.Type.back
        : RNCamera.Constants.Type.front
    );
  };

  const tryInvoice = async (paymentRequest: string, errorPrefix: string) => {
    if (!scanning || !rpcReady) {
      return;
    }

    paymentRequest = paymentRequest.toUpperCase();
    paymentRequest = paymentRequest.replace("LIGHTNING:", "");

    setScanning(false);

    // Check for lnurl
    if (paymentRequest.indexOf("LNURL") === 0) {
      console.log("LNURL");
      try {
        const type = await setLNURL(paymentRequest);
        if (type === "channelRequest") {
          console.log("Sending to ChannelRequest");
          navigation.replace("LNURL", { screen: "ChannelRequest" });
        }
        else if (type === "login") {
          navigation.replace("LNURL", { screen: "AuthRequest" });
        }
        else if (type === "withdrawRequest") {
          navigation.replace("LNURL", { screen: "WithdrawRequest" });
        }
        else if (type === "payRequest") {
          navigation.pop();
          navigation.navigate("LNURL", { screen: "PayRequest" });
        }
        else {
          console.log("Unknown lnurl request: " + type);
          Alert.alert(`Unsupported LNURL request: ${type}`, undefined,
            [{ text: "OK", onPress: () => setScanning(true) }]
          );
          lnurlClear();
        }
      } catch (e) { }
    }
    else {
      try {
        await setPayment({ paymentRequestStr: paymentRequest });
        navigation.replace("SendConfirmation");
      } catch (error) {
        Alert.alert(`${errorPrefix}: ${error.message}`, undefined,
          [{ text: "OK", onPress: () => setScanning(true) }]);
      }
    }
  };

  const onPasteClick = async () => {
    await tryInvoice(await Clipboard.getString(), "Clipboard paste error");
  };

  const onDebugPaste = async () => {
    const bolt11 = Chain === "mainnet"
      ? "lnbc1500n1pw5gmyxpp5tnx03hfr3tx2lx3aal045c5dycjsah6j6a80c27qmxla3nrk8xmsdp42fjkzep6ypxxjemgw3hxjmn8yptkset9dssx7e3qgehhyar4dejs6cqzpgxqr23s49gpc74nkm8em70rehny2fgkp94vwm6lh8ympp668x2asn8yf5vk76camftzte4nh3h8sf365vwx69mxp4x5p3s7jx8l57vaeqyr68gqx9eaf0"
      : "lntb12u1pww4ckdpp5xck8m9yerr9hqufyd6p0pp0pwjv5nqn6guwr9qf4l66wrqv3h2ssdp2xys9xct5da3kx6twv9kk7m3qg3hkccm9ypxxzar5v5cqp5ynhgvxfnkwxx75pcxcq2gye7m5dj26hjglqmhkz8rljhg3eg4hfyg38gnsynty3pdatjg9wpa7pe7g794y0hxk2gqd0hzg2hn5hlulqqen6cr5";
    await tryInvoice(bolt11, "Debug clipboard paste error");
  };

  const onBarCodeRead = async (data: string) => {
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
      <Camera
        cameraType={cameraType}
        onRead={onBarCodeRead}
        onNotAuthorized={() => setTimeout(() => navigation.pop(), 1)}
      >
        <View style={StyleSheet.absoluteFill}>
          <BarcodeMask
            showAnimatedLine={false}
            edgeColor={blixtTheme.primary}
            width={smallScreen ? 270 : 290}
            height={smallScreen ? 270 : 290}
          />
          <Icon type="Ionicons" name="md-swap" style={sendStyle.swapCamera} onPress={onCameraSwitchClick} />
          {__DEV__ && <Icon type="MaterialCommunityIcons" name="debug-step-over" style={sendStyle.pasteDebug} onPress={onDebugPaste} />}
          <Icon testID="paste-clipboard" type="FontAwesome" name="paste" style={sendStyle.paste} onPress={onPasteClick} />
        </View>
      </Camera>
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

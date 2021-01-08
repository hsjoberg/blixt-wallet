import React, { useEffect } from "react";
import { StatusBar, StyleSheet, Share } from "react-native";
import Clipboard from "@react-native-community/clipboard";
import { View, Button, H1, Text, Spinner } from "native-base";
import { StackNavigationProp } from "@react-navigation/stack";

import { WelcomeStackParamList } from "./index";
import { blixtTheme } from "../../native-base-theme/variables/commonColor";
import { useStoreState, useStoreActions } from "../../state/store";
import QrCode from "../../components/QrCode";

import style from "./style";
import { smallScreen } from "../../utils/device";
import Container from "../../components/Container";
import CopyAddress from "../../components/CopyAddress";
import { toast } from "../../utils";

interface IProps {
  navigation: StackNavigationProp<WelcomeStackParamList, "AddFunds">;
}
export default function AddFunds({ navigation }: IProps) {
  const getAddress = useStoreActions((store) => store.onChain.getAddress);
  const address = useStoreState((store) => store.onChain.address);

  useEffect(() => {
    if (!address) {
      (async () => {
        await getAddress({});
      })();
    }
  }, [getAddress]);

  if (!address) {
    return (
      <Container centered={true}>
        <Spinner color={blixtTheme.light} size={55} />
      </Container>
    );
  }

  const onBtcAddressTextPress = () => {
    Clipboard.setString(address!);
    toast("Copied to clipboard", undefined, "warning");
  };

  const onBtcAddressQrPress = async () => {
    await Share.share({
      message: "bitcoin:" + address!,
    });
  };

  return (
    <Container>
      <StatusBar
        barStyle="light-content"
        hidden={false}
        backgroundColor="transparent"
        animated={true}
        translucent={true}
      />
      <View style={style.content}>
        <View style={style.upperContent}>
          <View style={extraStyle.qr}>
            <View style={extraStyle.qrInner}>
              <QrCode size={smallScreen ? 150 : 250} style={extraStyle.qrImage} data={address} onPress={onBtcAddressQrPress} />
              <CopyAddress text={address} onPress={onBtcAddressTextPress} />
            </View>
          </View>
        </View>
        <View style={style.lowerContent}>
          <View style={style.text}>
            <H1 style={style.textHeader}>Add funds</H1>
            <Text>
              To start using Lightning in Blixt Wallet,{"\n"}send bitcoins to the address above.
            </Text>
          </View>
          <View style={style.buttons}>
            <Button style={style.button} block={true} onPress={() => navigation.navigate("AlmostDone")}>
              <Text>Continue</Text>
            </Button>
          </View>
        </View>
      </View>
    </Container>
  );
};

const extraStyle = StyleSheet.create({
  qr: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: blixtTheme.gray,
  },
  qrInner: {
    justifyContent: "center",
    alignItems: "center",
    flex: 1,
  },
  qrImage: {
    paddingTop: 8,
  },
});

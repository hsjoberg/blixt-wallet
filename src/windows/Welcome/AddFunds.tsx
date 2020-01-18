import React, { useEffect } from "react";
import { StatusBar, StyleSheet, Share } from "react-native";
import Clipboard from "@react-native-community/react-native-clipboard";
import { View, Button, H1, Text, Toast, Spinner } from "native-base";
import { NavigationScreenProp } from "react-navigation";

import { blixtTheme } from "../../../native-base-theme/variables/commonColor";
import { useStoreState, useStoreActions } from "../../state/store";
import QrCode from "../../components/QrCode";

import style from "./style";
import { smallScreen } from "../../utils/device";
import Container from "../../components/Container";
import Content from "../../components/Content";
import CopyAddress from "../../components/CopyAddress";

interface IProps {
  navigation: NavigationScreenProp<{}>;
}
export default ({ navigation }: IProps) => {
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
    Toast.show({
      text: "Copied to clipboard.",
      type: "warning",
    });
  };

  const onBtcAddressQrPress = async () => {
    await Share.share({
      message: "bitcoin:" + address!,
    });
  };

  return (
    <Container>
      <StatusBar
        backgroundColor={blixtTheme.dark}
        hidden={false}
        translucent={false}
        networkActivityIndicatorVisible={true}
        barStyle="light-content"
      />
      <Content style={style.content}>
        <View style={style.upperContent}>
          <View style={extraStyle.qr}>
            <View style={extraStyle.qrInner}>
              <QrCode size={smallScreen ? 150 : 275} style={extraStyle.qrImage} data={address} onPress={onBtcAddressQrPress} />
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
      </Content>
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
  address: {
    paddingTop: 6,
    paddingRight: 4,
    paddingLeft: 4,
    marginBottom: 4,
    width: "60%",
  },
});

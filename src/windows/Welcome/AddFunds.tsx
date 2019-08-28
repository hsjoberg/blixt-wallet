import React, { useEffect } from "react";
import { StatusBar, StyleSheet, Clipboard, Share, Dimensions } from "react-native";
import { Container,  View, Button, H1, Text, Toast, Content } from "native-base";
import { NavigationScreenProp } from "react-navigation";

import { blixtTheme } from "../../../native-base-theme/variables/commonColor";
import { useStoreState, useStoreActions } from "../../state/store";
import QrCode from "../../components/QrCode";

import style from "./style";

const smallScreen = Dimensions.get("window").height < 700;

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
    return (<></>);
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
      <Content contentContainerStyle={style.content}>
        <View style={style.upperContent}>
          <View style={extraStyle.qr}>
            <View style={extraStyle.qrInner}>
              <QrCode style={extraStyle.qrImage} data={address} size={smallScreen ? 240 : 275} onPress={onBtcAddressQrPress} />
              <Text style={extraStyle.address} numberOfLines={1} lineBreakMode="middle" onPress={onBtcAddressTextPress}>
                {address}
              </Text>
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

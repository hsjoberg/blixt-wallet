import React, { useEffect } from "react";
import { StyleSheet, View, Clipboard } from "react-native";
import { Body, Text, Header, Container, H1, H3, Right, Left, Button, Title, Icon, Toast } from "native-base";
import { NavigationScreenProp } from "react-navigation";
import * as QRCode from "qrcode";
import SvgUri from "react-native-svg-uri";

import { blixtTheme } from "../../../native-base-theme/variables/commonColor";
import { useStoreState, useStoreActions } from "../../state/store";

interface IOnChainInfoProps {
  navigation: NavigationScreenProp<{}>;
}
export const OnChainInfo = ({ navigation }: IOnChainInfoProps) => {
  const getBalance = useStoreActions((store) => store.onChain.getBalance);
  const getAddress = useStoreActions((store) => store.onChain.getAddress);
  const balance = useStoreState((store) => store.onChain.balance);
  const address = useStoreState((store) => store.onChain.address);

  useEffect(() => {
    (async () => {
      await getBalance(undefined);
      await getAddress(undefined);
    })();
  }, []);

  if (!address) {
    return (<></>);
  }

  const onGeneratePress = async () => await getAddress(undefined);

  const onBtcAddressPress = () => {
    Clipboard.setString(address);
    Toast.show({
      text: "Copied to clipboard.",
      type: "warning",
    });
  };

  return (
    <Container>
      <Header iosBarStyle="light-content" translucent={false}>
        <Left>
          <Button transparent={true} onPress={() => navigation.navigate("Main")}>
            <Icon name="arrow-back" />
          </Button>
        </Left>
        <Body>
          <Title>Bitcoin</Title>
        </Body>
        <Right>
          <Button transparent={true} onPress={() => navigation.navigate("OnChainTransactionLog")}>
            <Icon type="AntDesign" name="bars" />
          </Button>
        </Right>
      </Header>
      <View style={{ flex: 1 }}>
        <View style={style.fundsInfo}>
          <H1 style={{ textAlign: "center" }}>On-chain funds:{"\n"}{balance.toString()} Satoshi</H1>
        </View>

        <View style={style.qrContainer}>
          <View style={style.qr}>
            <H3 style={{ marginBottom: 8 }}>Send Bitcoin on-chain to this address:</H3>
            <SvgUri
              width={340}
              height={340}
              fill={blixtTheme.light}
              svgXmlData={(QRCode as any).toString(address.toUpperCase())._55}
            />
            <Text
              style={{ paddingTop: 6, paddingLeft: 18, paddingRight: 18, paddingBottom: 20 }}
              numberOfLines={1}
              lineBreakMode="middle"
              onPress={onBtcAddressPress}>
                {address}
            </Text>
          </View>
          <Button block={true} primary={true} onPress={onGeneratePress}>
            <Text>Generate new address</Text>
          </Button>
        </View>
      </View>
    </Container>
  );
};

const style = StyleSheet.create({
  fundsInfo: {
    flex: 0.25,
    width: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  qrContainer: {
    flex: 0.75,
    paddingLeft: 24,
    paddingRight: 24,
    paddingBottom: 24,
    justifyContent: "space-between",
    alignItems: "center",
    width: "100%",
  },
  qr: {
    flex: 1,
    width: "100%",
    alignItems: "center",
  },
});

export default OnChainInfo;

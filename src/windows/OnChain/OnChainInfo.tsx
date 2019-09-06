import React, { useEffect } from "react";
import { StyleSheet, View, Dimensions, Share } from "react-native";
import Clipboard from "@react-native-community/react-native-clipboard";
import { Body, Text, Header, Container, H1, H3, Right, Left, Button, Title, Icon, Toast } from "native-base";
import { NavigationScreenProp } from "react-navigation";

import { useStoreState, useStoreActions } from "../../state/store";
import QrCode from "../../components/QrCode";
import { formatBitcoin } from "../../utils/bitcoin-units";

const smallScreen = Dimensions.get("window").height < 700;

interface IOnChainInfoProps {
  navigation: NavigationScreenProp<{}>;
}
export const OnChainInfo = ({ navigation }: IOnChainInfoProps) => {
  const getBalance = useStoreActions((store) => store.onChain.getBalance);
  const getAddress = useStoreActions((store) => store.onChain.getAddress);
  const balance = useStoreState((store) => store.onChain.balance);
  const address = useStoreState((store) => store.onChain.address);
  const bitcoinUnit = useStoreState((store) => store.settings.bitcoinUnit);

  useEffect(() => {
    (async () => {
      await getBalance(undefined);
    })();
  }, []);

  const onGeneratePress = async () => await getAddress({ forceNew: true });

  const onWithdrawPress = () => navigation.navigate("Withdraw");

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
      <View style={style.container}>
        <View style={style.fundsInfo}>
          <H1 style={style.fundsInfoText}>
            On-chain funds:{"\n"}
            {formatBitcoin(balance, bitcoinUnit)}
          </H1>
        </View>
        <View style={style.qr}>
          {address &&
            <>
              <H3 style={style.sendBitcoinsLabel}>Send Bitcoin on-chain to this address:</H3>
              <QrCode data={address} size={smallScreen ? 250 : undefined} onPress={onBtcAddressQrPress} />
              <Text style={style.address} numberOfLines={1} lineBreakMode="middle" onPress={onBtcAddressTextPress}>
                {address}
              </Text>
            </>
          }
        </View>
        <View style={style.buttons}>
          <Button style={style.button} block={true} primary={true} onPress={onGeneratePress}>
            <Text>Generate new address</Text>
          </Button>
          <Button style={[style.button, { marginBottom: 0 }]} block={true} primary={true} onPress={onWithdrawPress}>
            <Text>Withdraw coins</Text>
          </Button>
        </View>
      </View>
    </Container>
  );
};

const style = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "space-between",
    padding: 24,
  },
  fundsInfo: {
    marginTop: !smallScreen ? 24 : 0,
    width: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  fundsInfoText: {
    textAlign: "center",
  },
  qr: {
    width: "100%",
    alignItems: "center",
  },
  sendBitcoinsLabel: {
    marginBottom: 8,
  },
  address: {
    paddingTop: 6,
    paddingRight: 18,
    paddingBottom: 20,
    paddingLeft: 18,
  },
  buttons: {
    width: "100%",
  },
  button: {
    marginBottom: 12,
  },
});

export default OnChainInfo;

import React, { useEffect } from "react";
import { StyleSheet, View, Share } from "react-native";
import Clipboard from "@react-native-community/react-native-clipboard";
import { Body, Text, Header, Container, H1, H2, Right, Left, Button, Title, Icon, Toast, Spinner } from "native-base";
import { StackNavigationProp } from "@react-navigation/stack";

import { OnChainStackParamList } from "./index";
import { useStoreState, useStoreActions } from "../../state/store";
import QrCode from "../../components/QrCode";
import { formatBitcoin, valueFiat } from "../../utils/bitcoin-units";
import { smallScreen } from "../../utils/device";
import CopyAddress from "../../components/CopyAddress";
import { blixtTheme } from "../../../native-base-theme/variables/commonColor";

interface IOnChainInfoProps {
  navigation: StackNavigationProp<OnChainStackParamList, "OnChainInfo">;
}
export const OnChainInfo = ({ navigation }: IOnChainInfoProps) => {
  const rpcReady = useStoreState((store) => store.lightning.rpcReady);
  const getBalance = useStoreActions((store) => store.onChain.getBalance);
  const getAddress = useStoreActions((store) => store.onChain.getAddress);
  const balance = useStoreState((store) => store.onChain.balance);
  const address = useStoreState((store) => store.onChain.address);
  const bitcoinUnit = useStoreState((store) => store.settings.bitcoinUnit);
  const fiatUnit = useStoreState((store) => store.settings.fiatUnit);
  const currentRate = useStoreState((store) => store.fiat.currentRate);
  const preferFiat = useStoreState((store) => store.settings.preferFiat);
  const changePreferFiat  = useStoreActions((store) => store.settings.changePreferFiat);

  useEffect(() => {
    if (rpcReady) {
      (async () => {
        await getBalance(undefined);
      })();
    }
  }, [getBalance, rpcReady]);

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

  const onPressBalance = async () => {
    await changePreferFiat(!preferFiat);
  };

  const onChainFunds = preferFiat
    ? (valueFiat(balance, currentRate).toFixed(2) + " " + fiatUnit)
    : formatBitcoin(balance, bitcoinUnit)
  ;

  return (
    <Container>
      <Header iosBarStyle="light-content" translucent={false}>
        <Left>
          <Button transparent={true} onPress={() => navigation.goBack()}>
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
          {smallScreen ?
          <>
            <H2 style={style.fundsInfoText}>
              On-chain funds:
            </H2>
              <H2 style={style.fundsInfoText} onPress={onPressBalance} testID="ONCHAIN_FUNDS">
                {onChainFunds}
              </H2>
              </>
          :
          <>
            <H1 style={style.fundsInfoText}>
              On-chain funds:
            </H1>
              <H1 style={style.fundsInfoText} onPress={onPressBalance} testID="ONCHAIN_FUNDS">
                {onChainFunds}
              </H1>
              </>
          }
        </View>
        <View style={style.qr}>
          {address &&
            <>
              <Text style={style.sendBitcoinsLabel}>Send Bitcoin on-chain to this address:</Text>
              <QrCode data={address} size={smallScreen ? 200 : undefined} onPress={onBtcAddressQrPress} />
              <CopyAddress testID="COPY_BITCOIN_ADDRESS" text={address} onPress={onBtcAddressTextPress} />
            </>
          }
          {!address &&
            <Spinner color={blixtTheme.light} />
          }
        </View>
        <View style={style.buttons}>
          <Button testID="GENERATE_ADDRESS" block={true} primary={true} disabled={!rpcReady} style={style.button} onPress={onGeneratePress}>
            <Text>Generate new address</Text>
          </Button>
          <Button testID="WITHDRAW" block={true} primary={true} disabled={!rpcReady} style={[style.button, { marginBottom: 0 }]} onPress={onWithdrawPress}>
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
    padding: 12,
  },
  fundsInfo: {
    marginTop: !smallScreen ? 32 : 8,
    width: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  fundsInfoText: {
    textAlign: "center",
    margin: 0,
  },
  qr: {
    width: "100%",
    alignItems: "center",
  },
  sendBitcoinsLabel: {
    marginBottom: 8,
  },
  buttons: {
    width: "100%",
  },
  button: {
    marginBottom: 12,
  },
});

export default OnChainInfo;

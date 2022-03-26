import React, { useEffect, useLayoutEffect } from "react";
import { StyleSheet, View, Share } from "react-native";
import Clipboard from "@react-native-community/clipboard";
import { Text, Container, H1, H2, Button, Icon, Spinner } from "native-base";
import { StackNavigationProp } from "@react-navigation/stack";

import { OnChainStackParamList } from "./index";
import { useStoreState, useStoreActions } from "../../state/store";
import QrCode from "../../components/QrCode";
import { formatBitcoin, valueFiat } from "../../utils/bitcoin-units";
import { smallScreen } from "../../utils/device";
import CopyAddress from "../../components/CopyAddress";
import { blixtTheme } from "../../native-base-theme/variables/commonColor";
import { toast } from "../../utils";
import { NavigationButton } from "../../components/NavigationButton";
import { lnrpc } from "../../../proto/lightning";

import { useTranslation, TFunction } from "react-i18next";
import { namespaces } from "../../i18n/i18n.constants";

let t:TFunction;

interface IOnChainInfoProps {
  navigation: StackNavigationProp<OnChainStackParamList, "OnChainInfo">;
}
export const OnChainInfo = ({ navigation }: IOnChainInfoProps) => {
  t = useTranslation(namespaces.onchain.onChainInfo).t;
  const rpcReady = useStoreState((store) => store.lightning.rpcReady);
  const getBalance = useStoreActions((store) => store.onChain.getBalance);
  const getAddress = useStoreActions((store) => store.onChain.getAddress);
  const balance = useStoreState((store) => store.onChain.balance);
  const address = useStoreState((store) => store.onChain.address);
  const addressType = useStoreState((store) => store.onChain.addressType);
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

  useLayoutEffect(() => {
    navigation.setOptions({
      headerTitle: "Bitcoin",
      headerBackTitle: t("buttons.back",{ns:namespaces.common}),
      headerShown: true,
      headerRight: () => {
        return (
          <NavigationButton onPress={() => navigation.navigate("OnChainTransactionLog")}>
            <Icon type="AntDesign" name="bars" style={{ fontSize: 22 }} />
          </NavigationButton>
        )
      }
    });
  }, [navigation]);

  const onGeneratePress = async () => await getAddress({ forceNew: true });
  const onGenerateP2SHPress = async () => await getAddress({ forceNew: true, p2sh: true });

  const onWithdrawPress = () => navigation.navigate("Withdraw");

  const onBtcAddressTextPress = () => {
    Clipboard.setString(address!);
    toast(t("address.alert"), undefined, "warning");
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
      <View style={style.container}>
        <View style={style.fundsInfo}>
          {smallScreen ?
            <>
              <H2 style={style.fundsInfoText}>
                {t("funds.title")}:
              </H2>
              <H2 style={style.fundsInfoText} onPress={onPressBalance} testID="ONCHAIN_FUNDS">
                {onChainFunds}
              </H2>
            </>
            :
            <>
              <H1 style={style.fundsInfoText}>
                {t("funds.title")}:
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
              <Text style={style.sendBitcoinsLabel}>{t("address.title")}:</Text>
              <QrCode data={
                  (addressType === lnrpc.AddressType.WITNESS_PUBKEY_HASH || addressType === lnrpc.AddressType.UNUSED_WITNESS_PUBKEY_HASH)
                  ? address.toUpperCase()
                  : address
                }
                size={smallScreen ? 200 : undefined}
                onPress={onBtcAddressQrPress}
              />
              <CopyAddress testID="COPY_BITCOIN_ADDRESS" text={address} onPress={onBtcAddressTextPress} />
            </>
          }
          {!address &&
            <Spinner color={blixtTheme.light} />
          }
        </View>
        <View style={style.buttons}>
          <Button
            testID="GENERATE_ADDRESS"
            block={true}
            primary={true}
            disabled={!rpcReady}
            style={style.button}
            onPress={onGeneratePress}
            onLongPress={() => onGenerateP2SHPress()}
          >
            <Text>{t("newAddress.title")}</Text>
          </Button>
          <Button testID="WITHDRAW" block={true} primary={true} disabled={!rpcReady} style={[style.button, { marginBottom: 0 }]} onPress={onWithdrawPress}>
            <Text>{t("withdraw.title")}</Text>
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
    marginBottom: 12,
  },
  button: {
    marginBottom: 12,
  },
});

export default OnChainInfo;

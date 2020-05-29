import React from "react";
import { View, Share, StyleSheet } from "react-native";
import Clipboard from "@react-native-community/react-native-clipboard";
import { Button, Body, Icon, Header, Text, Title, Left, H1, H3, Toast, Spinner } from "native-base";
import { formatDistanceStrict, fromUnixTime } from "date-fns";
import { RouteProp } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";

import { ReceiveStackParamList } from "./index";
import { useStoreState } from "../../state/store";
import { lnrpc } from "../../../proto/proto";
import QrCode from "../../components/QrCode";
import { formatBitcoin } from "../../utils/bitcoin-units";
import Ticker from "../../components/Ticker";
import { smallScreen } from "../../utils/device";
import CopyAddress from "../../components/CopyAddress";
import Container from "../../components/Container";
import Content from "../../components/Content";
import { blixtTheme } from "../../../native-base-theme/variables/commonColor";

interface IReceiveQRProps {
  navigation: StackNavigationProp<ReceiveStackParamList, "ReceiveQr">;
  route: RouteProp<ReceiveStackParamList, "ReceiveQr">;
}
export default function ReceiveQr({ navigation, route }: IReceiveQRProps) {
  const invoice: lnrpc.AddInvoiceResponse = route.params.invoice;
  const transaction = useStoreState((store) => store.transaction.getTransactionByPaymentRequest(invoice.paymentRequest));
  const bitcoinUnit = useStoreState((store) => store.settings.bitcoinUnit);

  if (!transaction) {
    return (
      <Container>
        <Header iosBarStyle="light-content" translucent={false}>
          <Left>
            <Button transparent={true}>
              <Icon name="arrow-back" />
            </Button>
          </Left>
          <Body>
            <Title>Receive</Title>
          </Body>
        </Header>
        <Content centered style={{ marginTop: -50 }}>
          <Spinner color={blixtTheme.light} size={55} />
        </Content>
      </Container>
    );
  }

  if (transaction.status === "SETTLED") {
    setTimeout(() => navigation.pop(), 1);
  }

  const onPressPaymentRequest = () => {
    Clipboard.setString(transaction.paymentRequest);
    Toast.show({
      text: "Copied to clipboard.",
      type: "warning",
    });
  };

  const onQrPress = async () => {
    await Share.share({
      message: "lightning:" + transaction.paymentRequest,
    });
  };

  return (
    <Container testID="qr">
      <Header iosBarStyle="light-content" translucent={false}>
        <Left>
          <Button testID="GO_BACK" transparent={true} onPress={() => navigation.pop()}>
            <Icon name="arrow-back" />
          </Button>
        </Left>
        <Body>
          <Title>Receive</Title>
        </Body>
      </Header>
      <View style={style.container}>
        <H1 style={style.scanThisQr}>Scan this QR code</H1>
        <Text testID="expire" style={style.expires}>
          <>Expires in </>
          <Ticker expire={transaction.expire.toNumber()} />
        </Text>
        <QrCode size={smallScreen ? 200 : undefined} data={transaction.paymentRequest.toUpperCase()} onPress={onQrPress} />
        {/* <Text testID="payment-request-string" onPress={onPressPaymentRequest} style={style.paymentRequest} numberOfLines={1} lineBreakMode="middle">
          {transaction.paymentRequest}
        </Text> */}
        <View style={{ width: "85%" }} testID="payment-request-string">
          <CopyAddress text={transaction.paymentRequest} onPress={onPressPaymentRequest} />
        </View>
        <H3 testID="pay-amount">{formatBitcoin(transaction.value, bitcoinUnit)}</H3>
      </View>
    </Container>
  );
};

const style = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    width: "100%",
    height: "100%",
    marginTop: -16,
  },
  scanThisQr: {
    marginBottom: 2,
  },
  expires: {
    marginBottom: 6,
  },
  paymentRequest: {
    paddingTop: 6,
    paddingLeft: 18,
    paddingRight: 18,
    paddingBottom: 20,
  },
});

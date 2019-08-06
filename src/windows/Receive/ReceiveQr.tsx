import React, { useState, useEffect } from "react";
import { View, Share, Clipboard } from "react-native";
import { Button, Body, Container, Icon, Header, Text, Title, Left, H1, H3, Toast } from "native-base";

import { NavigationScreenProp } from "react-navigation";
import { useStoreState } from "../../state/store";
import { lnrpc } from "../../../proto/proto";
import QrCode from "../../components/QrCode";

import { formatDistanceStrict, fromUnixTime } from "date-fns";

interface IReceiveQRProps {
  navigation: NavigationScreenProp<{}>;
}
export default ({ navigation }: IReceiveQRProps) => {
  const invoice: lnrpc.AddInvoiceResponse = navigation.getParam("invoice");
  const transaction = useStoreState((store) => store.transaction.getTransactionByPaymentRequest(invoice.paymentRequest));
  // const transaction = useStoreState((store) => store.transaction.getTransactionByRHash(Buffer.from(invoice.rHash).toString("hex")));

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
      </Container>
    );
  }

  if (transaction.status === "SETTLED") {
    console.log("Status settled");
    setTimeout(() => navigation.pop(), 1);
  }

  const Ticker = ({ expire }: { expire: number; }) => {
    const [display, setDisplay] = useState(formatDistanceStrict(new Date(), fromUnixTime(expire)));

    useEffect(() => {
      const interval = setInterval(() => {
        setDisplay(
          formatDistanceStrict(new Date(), fromUnixTime(expire))
        );
      }, 1000);

      return () => clearInterval(interval);
    }, [expire]);

    return (<>{display}</>);
  };

  const onPressPaymentRequest = () => {
    Clipboard.setString(transaction.paymentRequest);
    Toast.show({
      text: "Copied to clipboard.",
      type: "warning",
    });
  };

  return (
    <Container>
      <Header iosBarStyle="light-content" translucent={false}>
        <Left>
          <Button transparent={true} onPress={() => navigation.pop()}>
            <Icon name="arrow-back" />
          </Button>
        </Left>
        <Body>
          <Title>Receive</Title>
        </Body>
      </Header>
      <View style={{
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        width: "100%",
        height: "100%",
        marginTop: -16,
      }}>
        <H1>Scan this QR code</H1>
        <Text style={{ marginBottom: 6 }}>
          <>Expires in </>
          <Ticker
            expire={transaction.expire}
          />
        </Text>
        <QrCode
          data={transaction.paymentRequest.toUpperCase()}
          onPress={async () => {
            await Share.share({
              // message: lnInvoice,
              url: "lightning:" + transaction.paymentRequest,
            });
          }}
        />
        <Text
          onPress={onPressPaymentRequest}
          style={{ paddingTop: 6, paddingLeft: 18, paddingRight: 18, paddingBottom: 20 }}
          numberOfLines={1}
          lineBreakMode="middle"
        >
          {transaction.paymentRequest}
        </Text>
        <H3>{transaction.value} Satoshi</H3>
      </View>
    </Container>
  );
};

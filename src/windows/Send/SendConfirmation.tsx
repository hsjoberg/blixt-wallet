import React, { useState } from "react";
import { StatusBar } from "react-native";
import { Button, Container, Icon, Text, Header, Left, Title, Body, Input, Spinner, Toast } from "native-base";
import Long from "long";

import { useStoreActions, useStoreState } from "../../state/store";
import { NavigationScreenProp } from "react-navigation";
import { blixtTheme } from "../../../native-base-theme/variables/commonColor";
import BlixtForm from "../../components/Form";

export interface ISendConfirmationProps {
  navigation: NavigationScreenProp<{}>;
}
export default ({ navigation }: ISendConfirmationProps) => {
  const sendPayment = useStoreActions((actions) => actions.send.sendPayment);
  const getBalance = useStoreActions((actions) => actions.channel.getBalance);
  const nodeInfo = useStoreState((store) => store.send.remoteNodeInfo);
  const paymentRequest = useStoreState((store) => store.send.paymentRequest);
  const bolt11Invoice = useStoreState((store) => store.send.paymentRequestStr);

  const [isPaying, setIsPaying] = useState(false);

  if (!paymentRequest) {
    return (<Text>Error</Text>);
  }

  const send = async () => {
    try {
      setIsPaying(true);
      await sendPayment(undefined);
      await getBalance(undefined);
      navigation.pop();
    } catch (e) {
      console.log(e);

      Toast.show({
        duration: 12000,
        type: "danger",
        text: `Error: ${e.message}`,
        buttonText: "Okay",
      });
      setIsPaying(false);
    }
  };

  const formItems = [];

  formItems.push({
    key: "INVOICE",
    title: "Invoice",
    success: true,
    component: (
      <>
        <Input
          disabled={true}
          style={{ fontSize: 13, marginTop: 4 }}
          value={`${bolt11Invoice!.substring(0, 26).toLowerCase()}...`}
        />
        <Icon name="checkmark-circle" />
      </>
    ),
  });

  formItems.push({
    key: "AMOUNT_BTC",
    title: "Amount Sat",
    component: (<Input disabled={true} value={paymentRequest.numSatoshis.toString()} />),
  });

  formItems.push({
    key: "AMOUNT_FIAT",
    title: "Amount SEK",
    component: (<Input disabled={true} value={convertSatToFiat(paymentRequest.numSatoshis.toNumber()).toString()} />),
  });

  if (nodeInfo && nodeInfo.node && nodeInfo.node.alias) {
    formItems.push({
      key: "RECIPIENT",
      title: "Recipient",
      component: (<Input disabled={true} value={nodeInfo.node.alias} />),
    });
  }

  formItems.push({
    key: "MESSAGE",
    title: "Message",
    component: (<Input multiline={true} disabled={true} value={paymentRequest.description} />),
  });

  return (
    <Container>
      <StatusBar
        hidden={false}
        translucent={false}
        networkActivityIndicatorVisible={false}
      />
      <Header iosBarStyle="light-content">
        <Left>
          <Button transparent={true} onPress={() => navigation.navigate("SendCamera")}>
            <Icon name="arrow-back" />
          </Button>
        </Left>
        <Body>
          <Title>Confirm pay invoice</Title>
        </Body>
      </Header>
      <BlixtForm
        items={formItems}
        buttons={[(
          <Button
            key="PAY"
            disabled={isPaying}
            block={true}
            primary={true}
            onPress={send}>
            {!isPaying && <Text>Pay</Text>}
            {isPaying && <Spinner color={blixtTheme.light} />}
          </Button>
        ),]}
      />
    </Container>
  );
};

function convertSatToFiat(sat: number): number {
  return Number.parseFloat(((sat / 100000000) * 76270).toFixed(2));
}

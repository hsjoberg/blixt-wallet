import React, { useState, useEffect } from "react";
import { StatusBar } from "react-native";
import { Button, Container, Icon, Text, Header, Left, Title, Body, Input, Spinner, Toast } from "native-base";

import { useStoreActions, useStoreState } from "../../state/store";
import { NavigationScreenProp } from "react-navigation";
import { blixtTheme } from "../../../native-base-theme/variables/commonColor";
import BlixtForm from "../../components/Form";
import { valueBitcoin, BitcoinUnits, valueFiat } from "../../utils/bitcoin-units";
import { extractDescription } from "../../utils/NameDesc";

export interface ISendConfirmationProps {
  navigation: NavigationScreenProp<{}>;
}
export default ({ navigation }: ISendConfirmationProps) => {
  const sendPayment = useStoreActions((actions) => actions.send.sendPayment);
  const getBalance = useStoreActions((actions) => actions.channel.getBalance);
  const nodeInfo = useStoreState((store) => store.send.remoteNodeInfo);
  const paymentRequest = useStoreState((store) => store.send.paymentRequest);
  const bolt11Invoice = useStoreState((store) => store.send.paymentRequestStr);
  const convertSatToFiat = useStoreActions((store) => store.fiat.convertSatToFiat);
  const [isPaying, setIsPaying] = useState(false);
  const bitcoinUnit = useStoreState((store) => store.settings.bitcoinUnit);
  const fiatUnit = useStoreState((store) => store.settings.fiatUnit);
  const currentRate = useStoreState((store) => store.fiat.currentRate);

  const clear = useStoreActions((store) => store.send.clear);

  useEffect(() => {
    return () => clear();
  }, [clear]);

  if (!paymentRequest) {
    return (<Text>Error</Text>);
  }

  const { name, description } = extractDescription(paymentRequest.description);

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
    title: `Amount ${BitcoinUnits[bitcoinUnit].nice}`,
    component: (<Input disabled={true} value={valueBitcoin(paymentRequest.numSatoshis, bitcoinUnit)} />),
  });

  formItems.push({
    key: "AMOUNT_FIAT",
    title: `Amount ${fiatUnit}`,
    component: (<Input disabled={true} value={valueFiat(paymentRequest.numSatoshis, currentRate).toFixed(2)} />),
  });

  if (name) {
    formItems.push({
      key: "RECIPIENT",
      title: "Recipient",
      component: (<Input multiline={true} disabled={true} value={name} />),
    });
  }
  else if (nodeInfo && nodeInfo.node && nodeInfo.node.alias) {
    formItems.push({
      key: "NODE_ALIAS",
      title: "Node Alias",
      component: (<Input disabled={true} value={nodeInfo.node.alias} />),
    });
  }

  formItems.push({
    key: "MESSAGE",
    title: "Message",
    component: (<Input multiline={true} disabled={true} value={description} />),
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
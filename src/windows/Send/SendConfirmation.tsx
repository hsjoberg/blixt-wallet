import React, { useState, useEffect } from "react";
import { StatusBar, Vibration, BackHandler } from "react-native";
import { Button, Container, Icon, Text, Header, Left, Title, Body, Input, Spinner, Toast } from "native-base";
import { StackNavigationProp } from "@react-navigation/stack";

import { SendStackParamList } from "./index";
import { useStoreActions, useStoreState } from "../../state/store";
import { blixtTheme } from "../../../native-base-theme/variables/commonColor";
import BlixtForm from "../../components/Form";
import { BitcoinUnits, unitToSatoshi } from "../../utils/bitcoin-units";
import { extractDescription } from "../../utils/NameDesc";
import Long from "long";
import useBalance from "../../hooks/useBalance";
import { RouteProp } from "@react-navigation/native";

export interface ISendConfirmationProps {
  navigation: StackNavigationProp<SendStackParamList, "SendConfirmation">;
  route: RouteProp<SendStackParamList, "SendConfirmation">;
}
export default ({ navigation, route }: ISendConfirmationProps) => {
  const [amountEditable, setAmountEditable] = useState(false);
  const sendPayment = useStoreActions((actions) => actions.send.sendPayment);
  const getBalance = useStoreActions((actions) => actions.channel.getBalance);
  const nodeInfo = useStoreState((store) => store.send.remoteNodeInfo);
  const paymentRequest = useStoreState((store) => store.send.paymentRequest);
  const bolt11Invoice = useStoreState((store) => store.send.paymentRequestStr);
  const [isPaying, setIsPaying] = useState(false);
  const bitcoinUnit = useStoreState((store) => store.settings.bitcoinUnit);
  const fiatUnit = useStoreState((store) => store.settings.fiatUnit);
  const lightningReady = useStoreState((store) => store.lightning.ready);
  const rpcReady = useStoreState((store) => store.lightning.rpcReady);
  const syncedToChain = useStoreState((store) => store.lightning.syncedToChain);
  const syncedToGraph = useStoreState((store) => store.lightning.syncedToGraph);
  const {
    dollarValue,
    bitcoinValue,
    onChangeFiatInput,
    onChangeBitcoinInput,
  } = useBalance((paymentRequest?.numSatoshis));
  const clear = useStoreActions((store) => store.send.clear);
  const callback = (route.params?.callback) ?? (() => {});

  useEffect(() => {
    const backHandler = BackHandler.addEventListener("hardwareBackPress", () => {
      callback(null);
    });

    if (paymentRequest) {
      if (!paymentRequest.numSatoshis) {
        setAmountEditable(true);
      }
    }

    return () => {
      backHandler.remove()
      clear();
    }
  }, []);

  if (!paymentRequest) {
    return (<Text>Error</Text>);
  }

  const { name, description } = extractDescription(paymentRequest.description);

  const send = async () => {
    try {
      setIsPaying(true);
      const payload = amountEditable
        ? { amount: Long.fromValue(unitToSatoshi(Number.parseFloat(bitcoinValue || "0"), bitcoinUnit)) }
        : undefined;
      const response = await sendPayment(payload);
      await getBalance();
      Vibration.vibrate(32);
      callback(response.paymentPreimage);
      navigation.pop();
    } catch (e) {
      console.log(e);

      Toast.show({
        duration: 60000,
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
    component: (
      <Input
        disabled={!amountEditable}
        onChangeText={(amountEditable && onChangeBitcoinInput) || undefined}
        placeholder="0"
        value={bitcoinValue}
        keyboardType="numeric"
      />
    ),
  });

  formItems.push({
    key: "AMOUNT_FIAT",
    title: `Amount ${fiatUnit}`,
    component: (
      <Input
        disabled={!amountEditable}
        onChangeText={(amountEditable && onChangeFiatInput) || undefined}
        placeholder="0.00"
        value={dollarValue}
        keyboardType="numeric"
      />
    ),
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

  const canSend = (
    lightningReady &&
    rpcReady &&
    syncedToChain &&
    syncedToGraph &&
    !isPaying
  );

  return (
    <Container>
      <StatusBar
        hidden={false}
        translucent={false}
        networkActivityIndicatorVisible={false}
      />
      <Header iosBarStyle="light-content">
        <Left>
          <Button transparent={true} onPress={() => { callback(null); navigation.pop()}}>
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
            testID="pay-invoice"
            block={true}
            primary={true}
            onPress={send}
            disabled={!canSend || (amountEditable ? (bitcoinValue === "0" || bitcoinValue === "" || bitcoinValue === undefined) : false)}
          >
            {canSend && <Text>Pay</Text>}
            {!canSend && <Spinner color={blixtTheme.light} />}
          </Button>
        ),]}
      />
    </Container>
  );
};

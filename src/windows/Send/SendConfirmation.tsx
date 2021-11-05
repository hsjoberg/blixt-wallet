import React, { useState, useEffect, useLayoutEffect } from "react";
import { Vibration, BackHandler, Keyboard } from "react-native";
import { Button, Container, Icon, Text, Input, Spinner } from "native-base";
import { RouteProp } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";

import { SendStackParamList } from "./index";
import { useStoreActions, useStoreState } from "../../state/store";
import { blixtTheme } from "../../native-base-theme/variables/commonColor";
import BlixtForm from "../../components/Form";
import { BitcoinUnits, unitToSatoshi } from "../../utils/bitcoin-units";
import { extractDescription } from "../../utils/NameDesc";
import Long from "long";
import useBalance from "../../hooks/useBalance";
import { hexToUint8Array, toast } from "../../utils";
import { PLATFORM } from "../../utils/constants";
import useLightningReadyToSend from "../../hooks/useLightingReadyToSend";

export interface ISendConfirmationProps {
  navigation: StackNavigationProp<SendStackParamList, "SendConfirmation">;
  route: RouteProp<SendStackParamList, "SendConfirmation">;
}
export default function SendConfirmation({ navigation, route }: ISendConfirmationProps) {
  const [amountEditable, setAmountEditable] = useState(false);
  const sendPayment = useStoreActions((actions) => actions.send.sendPayment);
  const getBalance = useStoreActions((actions) => actions.channel.getBalance);
  const nodeInfo = useStoreState((store) => store.send.remoteNodeInfo);
  const paymentRequest = useStoreState((store) => store.send.paymentRequest);
  const bolt11Invoice = useStoreState((store) => store.send.paymentRequestStr);
  const [isPaying, setIsPaying] = useState(false);
  const bitcoinUnit = useStoreState((store) => store.settings.bitcoinUnit);
  const fiatUnit = useStoreState((store) => store.settings.fiatUnit);
  const {
    dollarValue,
    bitcoinValue,
    onChangeFiatInput,
    onChangeBitcoinInput,
  } = useBalance((paymentRequest?.numSatoshis), true);
  const clear = useStoreActions((store) => store.send.clear);
  const callback = (route.params?.callback) ?? (() => {});
  const lightningReadyToSend = useLightningReadyToSend();

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
      backHandler.remove();
      clear();
    }
  }, []);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerTitle: "Pay invoice",
      headerBackTitle: "Back",
      headerShown: true,
    });
  }, [navigation]);

  if (!paymentRequest) {
    return (<Text>Error</Text>);
  }

  const { name, description } = extractDescription(paymentRequest.description);

  const send = async () => {
    try {
      setIsPaying(true);
      Keyboard.dismiss();
      const payload = amountEditable
        ? { amount: Long.fromValue(unitToSatoshi(Number.parseFloat(bitcoinValue || "0"), bitcoinUnit)) }
        : undefined;

      const response = await sendPayment(payload);
      const preimage = hexToUint8Array(response.paymentPreimage);

      await getBalance();
      Vibration.vibrate(32);
      navigation.replace("SendDone", { preimage, callback });
    } catch (error) {
      console.log(error);
      toast(`Error: ${error.message}`, 60000, "danger", "Okay");
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
          value={`${bolt11Invoice!.substring(0, 29).toLowerCase()}...`}
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
        returnKeyType="done"
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
        returnKeyType="done"
      />
    ),
  });

  if (name) {
    formItems.push({
      key: "RECIPIENT",
      title: "Recipient",
      component: (<Input disabled={true} value={name} />),
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
    component: (<Input multiline={PLATFORM === "android"} disabled={true} value={description} />),
  });

  const canSend = (
    lightningReadyToSend &&
    !isPaying
  );

  return (
    <Container>
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

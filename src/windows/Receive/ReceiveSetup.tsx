import React, { useState } from "react";
import { Button, Body, Container, Icon, Header, Text, Title, Left, Input, Toast, Spinner } from "native-base";
import { StackNavigationProp } from "@react-navigation/stack";
import Long from "long";

import { ReceiveStackParamList } from "./index";
import { useStoreActions, useStoreState } from "../../state/store";
import BlixtForm from "../../components/Form";
import { unitToSatoshi, BitcoinUnits, valueBitcoinFromFiat, convertBitcoinToFiat, formatBitcoin, valueBitcoin } from "../../utils/bitcoin-units";
import { blixtTheme } from "../../../native-base-theme/variables/commonColor";
import useBalance from "../../hooks/useBalance";

const MAX_SAT_INVOICE = 4294967;

export interface IReceiveSetupProps {
  navigation: StackNavigationProp<ReceiveStackParamList, "ReceiveSetup">;
}
export default ({ navigation }: IReceiveSetupProps) => {
  const rpcReady = useStoreState((store) => store.lightning.rpcReady);
  const syncedToChain = useStoreState((store) => store.lightning.syncedToChain);
  const invoiceSubscriptionStarted = useStoreState((store) => store.receive.invoiceSubscriptionStarted);
  const addInvoice = useStoreActions((store) => store.receive.addInvoice);
  const [description, setDescription] = useState<string>("");
  const bitcoinUnit = useStoreState((store) => store.settings.bitcoinUnit);
  const fiatUnit = useStoreState((store) => store.settings.fiatUnit);
  const [payer, setPayer] = useState<string>("");
  const [createInvoiceDisabled, setCreateInvoiceDisabled] = useState(false);
  const {
    dollarValue,
    bitcoinValue,
    onChangeFiatInput,
    onChangeBitcoinInput,
  } = useBalance();

  const channels = useStoreState((store) => store.channel.channels);

  const onCreateInvoiceClick = async () => {
    try {
      setCreateInvoiceDisabled(true);
      if (unitToSatoshi(Number.parseFloat(bitcoinValue!), bitcoinUnit) > MAX_SAT_INVOICE) {
        throw new Error("Invoice amount cannot be higher than " + formatBitcoin(Long.fromNumber(MAX_SAT_INVOICE), bitcoinUnit));
      }

      navigation.replace("ReceiveQr", {
        invoice: await addInvoice({
          sat: unitToSatoshi(Number.parseFloat(bitcoinValue || "0"), bitcoinUnit),
          description,
          tmpData: {
            payer: payer || null,
            type: "NORMAL",
            website: null,
          }
        })
      });
    } catch (e) {
      setCreateInvoiceDisabled(false);
      Toast.show({
        duration: 12000,
        type: "danger",
        text: `Error: ${e.message}`,
        buttonText: "Okay",
      });
    }
  };

  const formItems = [{
    key: "AMOUNT_SAT",
    title: `Amount ${BitcoinUnits[bitcoinUnit].nice}`,
    component: (
      <Input
        testID="input-amount-sat"
        onChangeText={onChangeBitcoinInput}
        placeholder="0"
        value={bitcoinValue !== undefined ? bitcoinValue.toString() : undefined}
        keyboardType="numeric"
      />
    ),
  }, {
    key: "AMOUNT_FIAT",
    title: `Amount ${fiatUnit}`,
    component: (
      <Input
        onChangeText={onChangeFiatInput}
        placeholder="0.00"
        value={dollarValue !== undefined ? dollarValue.toString() : undefined}
        keyboardType="numeric"
      />
    ),
  }, {
    key: "PAYER",
    title: "Payer",
    component: (
      <Input
        onChangeText={setPayer}
        placeholder="For bookkeeping (optional)"
        value={payer}
      />
    ),
  }, {
    key: "MESSAGE",
    title: "Message",
    component: (
      <Input
        testID="input-message"
        onChangeText={setDescription}
        placeholder="Message to payer (optional)"
        value={description}
      />
    ),
  }];

  const canSend = (
    rpcReady &&
    invoiceSubscriptionStarted &&
    syncedToChain &&
    channels.some((channel) => channel.active) &&
    !createInvoiceDisabled
  );

  return (
    <Container>
      <Header iosBarStyle="light-content" translucent={false}>
        <Left>
          <Button transparent={true} onPress={() => navigation.goBack()}>
            <Icon name="arrow-back" />
          </Button>
        </Left>
        <Body>
          <Title>Receive</Title>
        </Body>
      </Header>
      <BlixtForm
        items={formItems}
        buttons={[
          <Button
            testID="create-invoice"
            key="CREATE_INVOICE"
            block={true}
            primary={true}
            onPress={onCreateInvoiceClick}
            disabled={!canSend || bitcoinValue == "0" || bitcoinValue === undefined}
          >
            {canSend && !createInvoiceDisabled
              ? <Text>Create invoice</Text>
              : <Spinner color={blixtTheme.light} />
            }
          </Button>
        ]}
      />
    </Container>
  );
};

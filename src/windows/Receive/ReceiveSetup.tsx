import React, { useState } from "react";
import { Button, Body, Container, Icon, Header, Text, Title, Left, Input, Toast, Spinner } from "native-base";
import { NavigationScreenProp } from "react-navigation";
import Long from "long";

import { useStoreActions, useStoreState } from "../../state/store";
import BlixtForm from "../../components/Form";
import { unitToSatoshi, BitcoinUnits, valueBitcoinFromFiat, convertBitcoinToFiat, formatBitcoin, valueBitcoin } from "../../utils/bitcoin-units";
import { blixtTheme } from "../../../native-base-theme/variables/commonColor";

const MAX_SAT_INVOICE = 4294967;

interface IReceiveSetupProps {
  navigation: NavigationScreenProp<{}>;
}
export default ({ navigation }: IReceiveSetupProps) => {
  const rpcReady = useStoreState((store) => store.lightning.rpcReady);
  const addInvoice = useStoreActions((store) => store.receive.addInvoice);
  const [satValue, setSatValue] = useState<string | undefined>(undefined);
  const [dollarValue, setDollarValue] = useState<string | undefined>(undefined);
  const [description, setDescription] = useState<string>("");
  const bitcoinUnit = useStoreState((store) => store.settings.bitcoinUnit);
  const fiatUnit = useStoreState((store) => store.settings.fiatUnit);
  const currentRate = useStoreState((store) => store.fiat.currentRate);
  const [payer, setPayer] = useState<string>("");

  const onChangeSatInput = (text: string) => {
    if (bitcoinUnit === "satoshi") {
      text = text.replace(/\D+/g, "");
    }
    else {
      text = text.replace(/,/g, ".");
    }
    if (text.length === 0) {
      setSatValue(undefined);
      setDollarValue(undefined);
      return;
    }
    setSatValue(text);
    setDollarValue(
      convertBitcoinToFiat(
        unitToSatoshi(Number.parseFloat(text || "0"), bitcoinUnit),
        currentRate,
      )
    );
  };

  const onChangeFiatInput = (text: string) => {
    text = text.replace(/,/g, ".");
    if (text.length === 0 || text[0] === ".") {
      setSatValue(undefined);
      setDollarValue(undefined);
      return;
    }
    setSatValue(
      valueBitcoinFromFiat(Number.parseFloat(text), currentRate, bitcoinUnit)
    );
    setDollarValue(text);
  };

  const onCreateInvoiceClick = async () => {
    try {
      if (unitToSatoshi(Number.parseFloat(satValue!), bitcoinUnit) > MAX_SAT_INVOICE) {
        throw new Error("Invoice amount cannot be higher than " + formatBitcoin(Long.fromNumber(MAX_SAT_INVOICE), bitcoinUnit));
      }

      navigation.navigate("ReceiveQr", {
        invoice: await addInvoice({
          sat: unitToSatoshi(Number.parseFloat(satValue || "0"), bitcoinUnit),
          description,
          payer,
        })
      });
    } catch (e) {
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
        onChangeText={onChangeSatInput}
        placeholder="1000 (optional)"
        value={satValue !== undefined ? satValue.toString() : undefined}
        keyboardType="numeric"
      />
    ),
  }, {
    key: "AMOUNT_FIAT",
    title: `Amount ${fiatUnit}`,
    component: (
      <Input
        onChangeText={onChangeFiatInput}
        placeholder="0.00 (optional)"
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

  return (
    <Container>
      <Header iosBarStyle="light-content" translucent={false}>
        <Left>
          <Button transparent={true} onPress={() => navigation.navigate("Main")}>
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
            disabled={!rpcReady}
          >
            {rpcReady ? <Text>Create invoice</Text> : <Spinner color={blixtTheme.light} />}
          </Button>
        ]}
      />
    </Container>
  );
};

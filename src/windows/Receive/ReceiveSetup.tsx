import React, { useState } from "react";
import { Button, Body, Container, Icon, Header, Text, Title, Left, Input, Toast } from "native-base";

import { NavigationScreenProp } from "react-navigation";
import { useStoreActions, useStoreState } from "../../state/store";
import BlixtForm from "../../components/Form";
import { unitToSatoshi } from "../../utils";
import { BitcoinUnit, BitcoinUnitAlias } from "../../state/Settings";

interface IReceiveSetupProps {
  navigation: NavigationScreenProp<{}>;
}
export default ({ navigation }: IReceiveSetupProps) => {
  const addInvoice = useStoreActions((store) => store.receive.addInvoice);
  const [satValue, setSatValue] = useState<string | undefined>(undefined);
  const [dollarValue, setDollarValue] = useState<string | undefined>(undefined);
  const [description, setDescription] = useState<string>("");
  const convertSatToFiat = useStoreActions((store) => store.fiat.convertSatToFiat);
  const convertFiatToSat = useStoreActions((store) => store.fiat.convertFiatToSat);
  const bitcoinUnit = useStoreState((store) => store.settings.bitcoinUnit);

  const onChangeSatInput = (text: string) => {
    if (bitcoinUnit === BitcoinUnit.satoshi) {
      text = text.replace(/\D+/g, "");
    }
    else {
      text = text.replace(/,/g, ".");
    }
    setSatValue(text);
    setDollarValue(
      convertSatToFiat( // TODO change function to convertBitcoinToFiat (and pass bitcoinUnit as arg)
        unitToSatoshi(Number.parseFloat(text || "0"), bitcoinUnit)
      )
    );
  };

  const onChangeFiatInput = (text: string) => {
    text = text.replace(/,/g, ".");
    if (text.length === 0) {
      setDollarValue(undefined);
      return;
    }
    setSatValue(convertFiatToSat(Number.parseFloat(text)));
    setDollarValue(text);
  };

  const onCreateInvoiceClick = async () => {
    try {
      navigation.navigate("ReceiveQr", {
        invoice: await addInvoice({
          sat: unitToSatoshi(Number.parseFloat(satValue || "0"), bitcoinUnit),
          description,
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
    title: `Amount ${BitcoinUnitAlias[bitcoinUnit].nice}`,
    component: (
      <Input
        onChangeText={onChangeSatInput}
        placeholder="1000 (optional)"
        value={satValue !== undefined ? satValue.toString() : undefined}
        keyboardType="numeric"
      />
    ),
  }, {
    key: "AMOUNT_FIAT",
    title: "Amount $",
    component: (
      <Input
        onChangeText={onChangeFiatInput}
        placeholder="0.00 (optional)"
        value={dollarValue !== undefined ? dollarValue.toString() : undefined}
        keyboardType="numeric"
      />
    ),
  }, {
    key: "MESSAGE",
    title: "Message",
    component: (
      <Input
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
          <Button key="CREATE_INVOICE" block={true} primary={true} onPress={onCreateInvoiceClick}>
            <Text>Create invoice</Text>
          </Button>
        ]}
      />
    </Container>
  );
};

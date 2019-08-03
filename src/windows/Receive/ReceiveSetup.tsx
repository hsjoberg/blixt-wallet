import React, { useState } from "react";
import { Button, Body, Container, Icon, Header, Text, Title, Left, Input } from "native-base";

import { NavigationScreenProp } from "react-navigation";
import { useStoreActions } from "../../state/store";
import BlixtForm from "../../components/Form";

const BTCSAT = 100000000;
const BTCUSD = 8525;

interface IReceiveSetupProps {
  navigation: NavigationScreenProp<{}>;
}
export default ({ navigation }: IReceiveSetupProps) => {
  const addInvoice = useStoreActions((store) => store.receive.addInvoice);
  const [btcValue, setBtcValue] = useState<string | undefined>(undefined);
  const [satValue, setSatValue] = useState<string | undefined>(undefined);
  const [dollarValue, setDollarValue] = useState<string | undefined>(undefined);
  const [description, setDescription] = useState<string>("");

  const onChangeSatInput = (text: string) => {
    text = text.replace(/\D+/g, "");
    setSatValue(text);
    setDollarValue(((Number.parseInt(text || "0", 10) / BTCSAT) * BTCUSD).toFixed(2).toString());
  };

  const onChangeFiatInput = (text: string) => {
    text = text.replace(/,/g, ".");
    if (text.length === 0) {
      setBtcValue(undefined);
      setDollarValue(undefined);
      return;
    }
    setBtcValue((Number.parseFloat(text) / 5083).toFixed(8).toString());
    setSatValue(Math.floor(Number.parseFloat(text) / BTCUSD * BTCSAT).toString());
    setDollarValue(text);
  };

  const onCreateInvoiceClick = async () => {
    navigation.navigate("ReceiveQr", {
      invoice: await addInvoice({
        sat: Number.parseInt(satValue || "0", 10),
        description,
      })
    });
  };

  const formItems = [{
    key: "AMOUNT_SAT",
    title: "Amount sat",
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
          <Button
            key="CREATE_INVOICE"
            block={true}
            primary={true}
            onPress={onCreateInvoiceClick}
          >
            <Text>Create invoice</Text>
          </Button>
        ]}
      />
    </Container>
  );
};

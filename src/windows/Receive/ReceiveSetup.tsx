import React, { useState, useLayoutEffect } from "react";
import { Button, Body, Container, Icon, Header, Text, Title, Left, Input, Toast, Spinner } from "native-base";
import { StackNavigationProp } from "@react-navigation/stack";
import Long from "long";

import { ReceiveStackParamList } from "./index";
import { useStoreActions, useStoreState } from "../../state/store";
import BlixtForm from "../../components/Form";
import { formatBitcoin } from "../../utils/bitcoin-units";
import { blixtTheme } from "../../../native-base-theme/variables/commonColor";
import useBalance from "../../hooks/useBalance";
import { MAX_SAT_INVOICE } from "../../utils/constants";
import { toast } from "../../utils";

export interface IReceiveSetupProps {
  navigation: StackNavigationProp<ReceiveStackParamList, "ReceiveSetup">;
}
export default function ReceiveSetup({ navigation }: IReceiveSetupProps) {
  const rpcReady = useStoreState((store) => store.lightning.rpcReady);
  const syncedToChain = useStoreState((store) => store.lightning.syncedToChain);
  const invoiceSubscriptionStarted = useStoreState((store) => store.receive.invoiceSubscriptionStarted);
  const addInvoice = useStoreActions((store) => store.receive.addInvoice);
  const [description, setDescription] = useState<string>("");
  const bitcoinUnitKey = useStoreState((store) => store.settings.bitcoinUnit);
  const [payer, setPayer] = useState<string>("");
  const [createInvoiceDisabled, setCreateInvoiceDisabled] = useState(false);
  const {
    dollarValue,
    bitcoinValue,
    satoshiValue,
    onChangeFiatInput,
    onChangeBitcoinInput,
    bitcoinUnit,
    fiatUnit,
  } = useBalance();
  const channels = useStoreState((store) => store.channel.channels);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerTitle: "Receive",
      headerShown: true,
    });
  }, [navigation]);

  const onCreateInvoiceClick = async () => {
    try {
      setCreateInvoiceDisabled(true);
      if (satoshiValue > MAX_SAT_INVOICE) {
        throw new Error("Invoice amount cannot be higher than " + formatBitcoin(Long.fromNumber(MAX_SAT_INVOICE), bitcoinUnitKey));
      }

      navigation.replace("ReceiveQr", {
        invoice: await addInvoice({
          sat: satoshiValue,
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
      toast(`Error: ${e.message}`, 12000, "danger", "Okay");
    }
  };

  const formItems = [{
    key: "AMOUNT_SAT",
    title: `Amount ${bitcoinUnit.nice}`,
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

  const loading = (
    !rpcReady ||
    !invoiceSubscriptionStarted ||
    !syncedToChain ||
    createInvoiceDisabled ||
    (channels.length > 0 && !channels.some((channel) => channel.active))
  );

  const noticeText = rpcReady && channels.length === 0
    ? "Before you can receive, you need to open a Lightning channel."
    : undefined;

  return (
    <Container>
      <BlixtForm
        items={formItems}
        noticeText={noticeText}
        buttons={[
          <Button
            testID="create-invoice"
            key="CREATE_INVOICE"
            block={true}
            primary={true}
            onPress={onCreateInvoiceClick}
            disabled={!canSend}
          >
            {loading
              ? <Spinner color={blixtTheme.light} />
              : <Text>Create invoice</Text>
            }
          </Button>
        ]}
      />
    </Container>
  );
};

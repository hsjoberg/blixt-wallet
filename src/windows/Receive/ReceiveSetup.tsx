import React, { useState, useLayoutEffect, useEffect } from "react";
import { Button, Container, Icon, Text, Input, Spinner } from "native-base";
import DialogAndroid from "react-native-dialogs";
import { useDebounce } from "use-debounce";
import { StackNavigationProp } from "@react-navigation/stack";
import Long from "long";

import { ReceiveStackParamList } from "./index";
import { useStoreActions, useStoreState } from "../../state/store";
import BlixtForm from "../../components/Form";
import { formatBitcoin, BitcoinUnits } from "../../utils/bitcoin-units";
import { blixtTheme } from "../../../native-base-theme/variables/commonColor";
import useBalance from "../../hooks/useBalance";
import { MAX_SAT_INVOICE } from "../../utils/constants";
import { toast } from "../../utils";
import { Keyboard } from "react-native";

const MATH_PAD_HEIGHT = 44;

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
    evalMathExpression,
  } = useBalance();
  const channels = useStoreState((store) => store.channel.channels);

  const [mathPadVisibleOriginal, setMathPadVisible] = useState(false);
  const [mathPadVisibleShortDebounce] = useDebounce(mathPadVisibleOriginal, 1, { leading: true });
  const [mathPadVisible] = useDebounce(mathPadVisibleOriginal, 100);

  const [currentlyFocusedInput, setCurrentlyFocusedInput] = useState<"bitcoin" | "fiat" | "other">("other");

  useEffect(() => {
    const keyboardShowListener = Keyboard.addListener("keyboardDidShow", (event) => {
      // LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    });

    const keyboardHideListener = Keyboard.addListener("keyboardDidHide", (event) => {
      setMathPadVisible(false);
      setCurrentlyFocusedInput("other");
    });

    return () => {
      keyboardShowListener.remove();
      keyboardHideListener.remove();
    }
  })

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

  // Bitcoin unit
  const currentBitcoinUnit = useStoreState((store) => store.settings.bitcoinUnit);
  const changeBitcoinUnit = useStoreActions((store) => store.settings.changeBitcoinUnit);
  const onPressChangeBitcoinUnit = async () => {
    const { selectedItem } = await DialogAndroid.showPicker(null, null, {
      positiveText: null,
      negativeText: "Cancel",
      type: DialogAndroid.listRadio,
      selectedId: currentBitcoinUnit,
      items: [
        { label: BitcoinUnits.bitcoin.settings, id: "bitcoin" },
        { label: BitcoinUnits.bit.settings, id: "bit" },
        { label: BitcoinUnits.satoshi.settings, id: "satoshi" },
        { label: BitcoinUnits.milliBitcoin.settings, id: "milliBitcoin" },
      ]
    });
    if (selectedItem) {
      await changeBitcoinUnit(selectedItem.id);
    }
  }

  // Fiat unit
  const fiatRates = useStoreState((store) => store.fiat.fiatRates);
  const currentFiatUnit = useStoreState((store) => store.settings.fiatUnit);
  const changeFiatUnit = useStoreActions((store) => store.settings.changeFiatUnit);
  const onPressChangeFiatUnit = async () => {
    const { selectedItem } = await DialogAndroid.showPicker(null, null, {
      positiveText: null,
      negativeText: "Cancel",
      type: DialogAndroid.listRadio,
      selectedId: currentFiatUnit,
      items: Object.entries(fiatRates).map(([currency]) => {
        return {
          label: currency, id: currency
        }
      })
    });
    if (selectedItem) {
      await changeFiatUnit(selectedItem.id);
    }
  }

  const formItems = [{
    key: "AMOUNT_SAT",
    title: `Amount ${bitcoinUnit.nice}`,
    component: (
      <>
        <Input
          testID="input-amount-sat"
          onChangeText={onChangeBitcoinInput}
          placeholder="0"
          value={bitcoinValue !== undefined ? bitcoinValue.toString() : undefined}
          keyboardType="numeric"
          onFocus={() => {
            setMathPadVisible(true);
            setCurrentlyFocusedInput("bitcoin");
          }}
          onBlur={() => {
            // setMathPadVisible(false);
          }}
        />
        <Icon type="Foundation" name="bitcoin-circle" onPress={onPressChangeBitcoinUnit} style={{ fontSize: 31, marginRight: 1 }} />
      </>
    ),
  }, {
    key: "AMOUNT_FIAT",
    title: `Amount ${fiatUnit}`,
    component: (
      <>
        <Input
        onSubmitEditing={() => setMathPadVisible(false)}
          onChangeText={onChangeFiatInput}
          placeholder="0.00"
          value={dollarValue !== undefined ? dollarValue.toString() : undefined}
          keyboardType="numeric"
          onFocus={() => {
            setMathPadVisible(true);
            setCurrentlyFocusedInput("fiat");
          }}
          onBlur={() => {
            // setMathPadVisible(false);
          }}
        />
        <Icon type="FontAwesome" name="money" onPress={onPressChangeFiatUnit} />
      </>
    ),
  }, {
    key: "PAYER",
    title: "Payer",
    component: (
      <Input
        onChangeText={setPayer}
        placeholder="For bookkeeping (optional)"
        onFocus={() => setMathPadVisible(false)}
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
        onFocus={() => setMathPadVisible(false)}
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

  const showNoticeText = rpcReady && channels.length === 0;
  const noticeText = showNoticeText
    ? "Before you can receive, you need to open a Lightning channel."
    : undefined;

  const addMathOperatorToInput = (operator: "+" |  "-" |  "*" |  "/" |  "(" | ")") => {
    if (currentlyFocusedInput === "bitcoin") {
      onChangeBitcoinInput((bitcoinValue ?? "") + operator);
    }
    else if (currentlyFocusedInput === "fiat") {
      onChangeFiatInput((dollarValue ?? "") + operator);
    }
  };

  return (
    <Container>
      <BlixtForm
        mathPadProps={{
          visible: !showNoticeText && mathPadVisibleOriginal,
          onAddPress: () => addMathOperatorToInput("+"),
          onSubPress: () => addMathOperatorToInput("-"),
          onMulPress: () => addMathOperatorToInput("*"),
          onDivPress: () => addMathOperatorToInput("/"),
          onParenthesisLeftPress: () => addMathOperatorToInput("("),
          onParenthesisRightPress: () => addMathOperatorToInput(")"),
          onEqualSignPress: () => evalMathExpression(currentlyFocusedInput ?? "bitcoin"),
        }}
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
            style={{ marginBottom: mathPadVisible && false ? MATH_PAD_HEIGHT + 5 : 0 }}
          >
            {loading
              ? <Spinner color={blixtTheme.light} />
              : <Text>Create invoice</Text>
            }
          </Button>
        ]}
      />
      {/* {mathPadVisibleOriginal  && false &&
        <MathPad
          visible={mathPadVisibleOriginal}
          onAddPress={() => addMathOperatorToInput("+")}
          onSubPress={() => addMathOperatorToInput("-")}
          onMulPress={() => addMathOperatorToInput("*")}
          onDivPress={() => addMathOperatorToInput("/")}
          onParenthesisLeftPress={() => addMathOperatorToInput("(")}
          onParenthesisRightPress={() => addMathOperatorToInput(")")}
          onEqualSignPress={() => evalMathExpression(currentlyFocusedInput ?? "bitcoin")}
        />
      } */}
    </Container>
  );
};

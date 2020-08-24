import React, { useState, useLayoutEffect, useEffect } from "react";
import { Button, Body, Container, Icon, Header, Text, Title, Left, Input, Toast, Spinner } from "native-base";
import { useDebounce } from "use-debounce";
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
import { View, Keyboard, LayoutAnimation, StyleSheet } from "react-native";

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
  const [mathPadVisible] = useDebounce(mathPadVisibleOriginal, 100);

  const [currentlyFocusedInput, setCurrentlyFocusedInput] = useState<"bitcoin" | "fiat" | "other">("other");

  useEffect(() => {
    const keyboardShowListener = Keyboard.addListener("keyboardDidShow", (event) => {
      console.log("keyboardDidShow")
      // LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      // setMathPadVisible(true);
    });

    const keyboardHideListener = Keyboard.addListener("keyboardDidHide", (event) => {
      console.log("keyboardDidHide")
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
        onFocus={() => {
          setMathPadVisible(true);
          setCurrentlyFocusedInput("bitcoin");
        }}
        onBlur={() => {
          // setMathPadVisible(false);
        }}
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
        onFocus={() => {
          setMathPadVisible(true);
          setCurrentlyFocusedInput("fiat");
        }}
        onBlur={() => {
          setMathPadVisible(false);
        }}
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
            style={{ marginBottom: mathPadVisible ? MATH_PAD_HEIGHT + 5 : 0 }}
          >
            {loading
              ? <Spinner color={blixtTheme.light} />
              : <Text>Create invoice</Text>
            }
          </Button>
        ]}
      />
      <MathPad
        visible={mathPadVisible}
        onAddPress={() => addMathOperatorToInput("+")}
        onSubPress={() => addMathOperatorToInput("-")}
        onMulPress={() => addMathOperatorToInput("*")}
        onDivPress={() => addMathOperatorToInput("/")}
        onParenthesisLeftPress={() => addMathOperatorToInput("(")}
        onParenthesisRightPress={() => addMathOperatorToInput(")")}
        onEqualSignPress={() => evalMathExpression(currentlyFocusedInput ?? "bitcoin")}
      />
    </Container>
  );
};

export interface IMathPadProps {
  visible: boolean;
  onAddPress: () => void;
  onSubPress: () => void;
  onMulPress: () => void;
  onDivPress: () => void;
  onParenthesisLeftPress: () => void;
  onParenthesisRightPress: () => void;
  onEqualSignPress: () => void;
}
export function MathPad({ visible, onAddPress, onSubPress, onMulPress, onDivPress, onParenthesisLeftPress, onParenthesisRightPress, onEqualSignPress }: IMathPadProps) {
  return (
    <View style={{
      flexDirection: "row",
      justifyContent: "center",
      alignItems:"center",
      backgroundColor: blixtTheme.gray,
      overflow: "hidden",
      width: "100%",
      height: visible ? 50 : 0, // https://github.com/facebook/react-native/issues/18415
      // height: 50,
      opacity: visible ? 1 : 0,
      position: "absolute",
      bottom: 0,
    }}>
      <Button onPress={onAddPress} style={mathPadStyles.button}>
        <Text style={mathPadStyles.buttonText}>+</Text>
      </Button>
      <Button onPress={onSubPress} style={mathPadStyles.button}>
        <Text style={mathPadStyles.buttonText}>-</Text>
      </Button>
      <Button onPress={onMulPress} style={mathPadStyles.button}>
        <Text style={mathPadStyles.buttonText}>*</Text>
      </Button>
      <Button onPress={onDivPress} style={mathPadStyles.button}>
        <Text style={mathPadStyles.buttonText}>/</Text>
      </Button>
      <Button onPress={onParenthesisLeftPress} style={mathPadStyles.button}>
        <Text style={mathPadStyles.buttonText}>(</Text>
      </Button>
      <Button onPress={onParenthesisRightPress} style={mathPadStyles.button}>
        <Text style={mathPadStyles.buttonText}>)</Text>
      </Button>
      <Button onPress={onEqualSignPress} style={mathPadStyles.button}>
        <Text style={mathPadStyles.buttonText}>=</Text>
      </Button>
    </View>
  )
}

const mathPadStyles = StyleSheet.create({
  button: {
    marginBottom: 0,
    marginLeft: 5,
    marginRight: 5,
    height: 35,
    backgroundColor: blixtTheme.lightGray
  },
  buttonText: {
    fontFamily: "monospace",
    letterSpacing: 0,
  }
})
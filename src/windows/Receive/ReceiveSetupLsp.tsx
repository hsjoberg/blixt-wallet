import React, { useState, useLayoutEffect, useEffect } from "react";
import { Button, Icon, Text, Input, Spinner } from "native-base";
import DialogAndroid from "react-native-dialogs";
import { useDebounce } from "use-debounce";
import { StackNavigationProp } from "@react-navigation/stack";
import Long from "long";

import { ReceiveStackParamList } from "./index";
import { useStoreActions, useStoreState } from "../../state/store";
import BlixtForm from "../../components/Form";
import { formatBitcoin, BitcoinUnits, IBitcoinUnits, convertBitcoinToFiat, valueBitcoin, valueFiat } from "../../utils/bitcoin-units";
import { blixtTheme } from "../../native-base-theme/variables/commonColor";
import useBalance from "../../hooks/useBalance";
import { MATH_PAD_NATIVE_ID, MAX_SAT_INVOICE, PLATFORM } from "../../utils/constants";
import { timeout, toast } from "../../utils";
import { Keyboard, TextStyle } from "react-native";
import Container from "../../components/Container";
import { IFiatRates } from "../../state/Fiat";
import { Alert } from "../../utils/alert";
import TextClickable from "../../components/TextClickable";

const MATH_PAD_HEIGHT = 44;

export interface IReceiveSetupProps {
  navigation: StackNavigationProp<ReceiveStackParamList, "ReceiveSetup">;
}
export default function ReceiveSetupLsp({ navigation }: IReceiveSetupProps) {
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

  // Dunder
  const connectPeer = useStoreActions((store) => store.lightning.connectPeer);
  const checkOndemandChannelService = useStoreActions((store) => store.blixtLsp.ondemandChannel.checkOndemandChannelService);
  const ondemandChannelServiceStatus = useStoreActions((store) => store.blixtLsp.ondemandChannel.serviceStatus);
  const ondemandChannelStatus = useStoreState((store) => store.blixtLsp.ondemandChannel.status);
  const ondemandChannelServiceActive = useStoreState((store) => store.blixtLsp.ondemandChannel.serviceActive);
  const ondemandChannelAddInvoice = useStoreActions((store) => store.blixtLsp.ondemandChannel.addInvoice);
  const currentRate = useStoreState((store) => store.fiat.currentRate);
  const remoteBalance = useStoreState((store) => store.channel.remoteBalance);

  const shouldUseDunder =
    ondemandChannelServiceActive &&
    (
      rpcReady && channels.length === 0 ||
      remoteBalance.toSigned().subtract(5000).lessThan(satoshiValue) // Not perfect...
    );

  let minimumBitcoin: string | null = null;
  let minimumFiat: string | null = null;
  if (shouldUseDunder) {
    minimumBitcoin = valueBitcoin(
      Long.fromValue(ondemandChannelStatus?.minimumPaymentSat || 0),
      bitcoinUnitKey,
    );
    minimumFiat = Math.ceil(valueFiat(
      Long.fromValue(ondemandChannelStatus?.minimumPaymentSat ?? 0),
      currentRate,
    )).toFixed(2);

    // minimumBitcoin = formatBitcoin(
    //   Long.fromValue(ondemandChannelStatus?.minimumPaymentSat || 0),
    //   bitcoinUnitKey,
    // );
    // minimumFiat = convertBitcoinToFiat(
    //   ondemandChannelStatus?.minimumPaymentSat ?? 0,
    //   currentRate,
    //   fiatUnit,
    // );
  }

  useEffect(() => {
    (async () => {
      await checkOndemandChannelService();
    })();
  }, []);

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
  }, []); // TODO [] ???

  useLayoutEffect(() => {
    navigation.setOptions({
      headerTitle: "Receive",
      headerShown: true,
    });
  }, [navigation]);

  const createInvoice = async () => {
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

  const createBlixtLspInvoice = async () => {
    setCreateInvoiceDisabled(true);
    const result = await ondemandChannelServiceStatus();
    console.log(result);

    let connectToPeer = false;
    let attempt = 3;
    while (attempt--) {
      try {
        connectToPeer = !!(await connectPeer(result.peer));
        console.log("test");
      } catch (e) {
        if (!e.message.includes("already connected to peer")) {
          console.log(`Failed to connect: ${e.message}.`);
          await timeout(1000);
        } else {
          connectToPeer = true;
          break;
        }
      }
    }

    if (!connectToPeer) {
      setCreateInvoiceDisabled(false);
      Alert.alert("", "Failed to connect to Dunder, please try again later.");

      return;
    }

    const approxFeeSat = result.approxFeeSat;
    const approxFeeFormatted = formatBitcoin(Long.fromValue(approxFeeSat), bitcoinUnitKey);
    const approxFeeFiat = convertBitcoinToFiat(approxFeeSat, currentRate, fiatUnit);
    const message =
`In order to accept a payment for this invoice, a channel on the Lightning Network has to be opened.

This requires a one-time fee of approximately ${approxFeeFormatted} (${approxFeeFiat}).`;
    Alert.alert(
      "Channel opening",
      message,
      [{
        text: "Cancel",
        style: "cancel",
        onPress: () => {
          setCreateInvoiceDisabled(false);
        }
      }, {
        text: "Proceed",
        style: "default",
        onPress: async () => {
          try {
            setCreateInvoiceDisabled(true);
            navigation.replace("ReceiveQr", {
              invoice: await ondemandChannelAddInvoice({
                sat: satoshiValue,
                description
              }),
            });
          } catch (error) {
            Alert.alert("Error", error.message);
            setCreateInvoiceDisabled(false);
          }
        }
      }]
    );
  };

  // Bitcoin unit
  const currentBitcoinUnit = useStoreState((store) => store.settings.bitcoinUnit);
  const changeBitcoinUnit = useStoreActions((store) => store.settings.changeBitcoinUnit);
  const onPressChangeBitcoinUnit = async () => {
    if (PLATFORM === "android") {
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
    } else {
      navigation.navigate("ChangeBitcoinUnit", {
        title: "Change bitcoin unit",
        data: [
          { title: BitcoinUnits.bitcoin.settings, value: "bitcoin" },
          { title: BitcoinUnits.bit.settings, value: "bit" },
          { title: BitcoinUnits.satoshi.settings, value: "satoshi" },
          { title: BitcoinUnits.milliBitcoin.settings, value: "milliBitcoin" },
        ],
        onPick: async (currency) => await changeBitcoinUnit(currency as keyof IBitcoinUnits),
      });
    }
  }

  // Fiat unit
  const fiatRates = useStoreState((store) => store.fiat.fiatRates);
  const currentFiatUnit = useStoreState((store) => store.settings.fiatUnit);
  const changeFiatUnit = useStoreActions((store) => store.settings.changeFiatUnit);
  const onPressChangeFiatUnit = async () => {
    if (PLATFORM === "android") {
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
    } else {
      navigation.navigate("ChangeFiatUnit", {
        title: "Change fiat unit",
        data: Object.entries(fiatRates).map(([currency]) => ({
          title: currency,
          value: currency as keyof IFiatRates,
        })),
        onPick: async (currency) => await changeFiatUnit(currency as keyof IFiatRates),
        searchEnabled: true,
      });
    }
  }

  const formItems = [{
    key: "AMOUNT_SAT",
    title: `Amount ${bitcoinUnit.nice}`,
    component: (
      <>
        <Input
          onSubmitEditing={() => setMathPadVisible(false)}
          testID="input-amount-sat"
          onChangeText={onChangeBitcoinInput}
          placeholder={minimumBitcoin ? `At least ${minimumBitcoin}`: "0"}
          value={bitcoinValue !== undefined ? bitcoinValue.toString() : undefined}
          keyboardType="numeric"
          returnKeyType="done"
          onFocus={() => {
            setMathPadVisible(true);
            setCurrentlyFocusedInput("bitcoin");
          }}
          onBlur={() => {
            // setMathPadVisible(false);
          }}
          inputAccessoryViewID={MATH_PAD_NATIVE_ID}
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
          placeholder={minimumFiat ? `At least ${minimumFiat}` : "0.00"}
          value={dollarValue !== undefined ? dollarValue.toString() : undefined}
          keyboardType="numeric"
          returnKeyType="done"
          onFocus={() => {
            setMathPadVisible(true);
            setCurrentlyFocusedInput("fiat");
          }}
          onBlur={() => {
            // setMathPadVisible(false);
          }}
          inputAccessoryViewID={MATH_PAD_NATIVE_ID}
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
    (
      !createInvoiceDisabled &&
      rpcReady &&
      invoiceSubscriptionStarted &&
      syncedToChain
    )
    &&
    (
      (!shouldUseDunder && channels.some((channel) => channel.active)) ||
      (shouldUseDunder && satoshiValue >= Math.ceil((ondemandChannelStatus?.minimumPaymentSat || 0)))
    )
  );

  const loading = (
    !rpcReady ||
    !invoiceSubscriptionStarted ||
    !syncedToChain ||
    createInvoiceDisabled ||
    (channels.length > 0 && !channels.some((channel) => channel.active))
  );

  const showNoticeText = rpcReady && channels.length === 0;
  let noticeText: Element | undefined = showNoticeText
    ? "Before you can receive, you need to open a Lightning channel."
    : undefined;
  if (shouldUseDunder) {
    // noticeText = `Create an invoice with with at least ${minimumBitcoin} (${minimumFiat}).`;
    noticeText = (
      <>
        A payment channel by Dunder LSP will be opened when this invoice is paid.
        {" \n"}
        <TextClickable style={{
          fontSize: 14,
          lineHeight: 23,
        } as TextStyle} onPress={() => navigation.navigate("DunderLspInfo")}>What's this?</TextClickable>
      </>
    );
  }

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
          visible: mathPadVisibleOriginal,
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
        noticeIcon="info"
        buttons={[
         <Button
            testID="create-invoice"
            key="CREATE_INVOICE"
            block={true}
            primary={true}
            onPress={shouldUseDunder ? createBlixtLspInvoice : createInvoice}
            onLongPress={ondemandChannelServiceActive ? createBlixtLspInvoice : undefined}
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

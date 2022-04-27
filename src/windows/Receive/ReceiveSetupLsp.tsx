import React, { useState, useLayoutEffect, useEffect } from "react";
import { Button, Icon, Text, Input, Spinner } from "native-base";
import DialogAndroid from "react-native-dialogs";
import { useDebounce } from "use-debounce";
import { StackNavigationProp } from "@react-navigation/stack";
import Long from "long";

import { ReceiveStackParamList } from "./index";
import { useStoreActions, useStoreState } from "../../state/store";
import BlixtForm from "../../components/Form";
import { formatBitcoin, BitcoinUnits, IBitcoinUnits, valueBitcoin, valueFiat } from "../../utils/bitcoin-units";
import { blixtTheme } from "../../native-base-theme/variables/commonColor";
import useBalance from "../../hooks/useBalance";
import { MATH_PAD_NATIVE_ID, MAX_SAT_INVOICE, PLATFORM } from "../../utils/constants";
import { toast } from "../../utils";
import { Keyboard, TextStyle } from "react-native";
import Container from "../../components/Container";
import { IFiatRates } from "../../state/Fiat";
import { Alert } from "../../utils/alert";
import TextClickable from "../../components/TextClickable";
import { dunderPrompt } from "../../utils/dunder";

import { useTranslation } from "react-i18next";
import { namespaces } from "../../i18n/i18n.constants";

const MATH_PAD_HEIGHT = 44;

export interface IReceiveSetupProps {
  navigation: StackNavigationProp<ReceiveStackParamList, "ReceiveSetup">;
}
export default function ReceiveSetupLsp({ navigation }: IReceiveSetupProps) {
  const t = useTranslation(namespaces.receive.receiveSetup).t;
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
  const ondemandConnectToService = useStoreActions((store) => store.blixtLsp.ondemandChannel.connectToService);
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
      headerTitle: t("layout.title"),
      headerShown: true,
    });
  }, [navigation]);

  const createInvoice = async () => {
    try {
      setCreateInvoiceDisabled(true);
      if (satoshiValue > MAX_SAT_INVOICE) {
        throw new Error(t("createInvoice.error")+" " + formatBitcoin(Long.fromNumber(MAX_SAT_INVOICE), bitcoinUnitKey));
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
      toast(`${t("msg.error")}: ${e.message}`, 12000, "danger", "Okay");
    }
  };

  const createBlixtLspInvoice = async () => {
    setCreateInvoiceDisabled(true);

    const connectToPeer = await ondemandConnectToService();
    if (!connectToPeer) {
      setCreateInvoiceDisabled(false);
      Alert.alert("", "Failed to connect to Dunder, please try again later.");
      return;
    }

    const serviceStatus = await ondemandChannelServiceStatus();
    const result = await dunderPrompt(
      serviceStatus.approxFeeSat,
      bitcoinUnitKey,
      currentRate,
      fiatUnit,
    );
    if (!result) {
      setCreateInvoiceDisabled(false);
      return;
    }

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
  };

  // Bitcoin unit
  const currentBitcoinUnit = useStoreState((store) => store.settings.bitcoinUnit);
  const changeBitcoinUnit = useStoreActions((store) => store.settings.changeBitcoinUnit);
  const onPressChangeBitcoinUnit = async () => {
    if (PLATFORM === "android") {
      const { selectedItem } = await DialogAndroid.showPicker(null, null, {
        positiveText: null,
        negativeText: t("buttons.cancel",{ns:namespaces.common}),
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
        title: t("form.amountBitcoin.change"),
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
        negativeText: t("buttons.cancel",{ns:namespaces.common}),
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
        title: t("form.amountFiat.change"),
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
    title: `${t("form.amountBitcoin.title")} ${bitcoinUnit.nice}`,
    component: (
      <>
        <Input
          onSubmitEditing={() => setMathPadVisible(false)}
          testID="input-amount-sat"
          onChangeText={onChangeBitcoinInput}
          placeholder={minimumBitcoin ? `${t("form.amountBitcoin.dunderPlaceholder")} ${minimumBitcoin}`: "0"}
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
    title: `${t("form.amountFiat.title")} ${fiatUnit}`,
    component: (
      <>
        <Input
          onSubmitEditing={() => setMathPadVisible(false)}
          onChangeText={onChangeFiatInput}
          placeholder={minimumFiat ? `${t("form.amountFiat.dunderPlaceholder")} ${minimumFiat}` : "0.00"}
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
    title: t("form.payer.title"),
    component: (
      <Input
        onChangeText={setPayer}
        placeholder={t("form.payer.placeholder")}
        onFocus={() => setMathPadVisible(false)}
        value={payer}
      />
    ),
  }, {
    key: "MESSAGE",
    title: t("form.description.title"),
    component: (
      <Input
        testID="input-message"
        onChangeText={setDescription}
        placeholder={t("form.description.placeholder")}
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
  let noticeText: JSX.Element | undefined = showNoticeText
    ? t("createInvoice.alert")
    : undefined;
  if (shouldUseDunder) {
    // noticeText = `Create an invoice with with at least ${minimumBitcoin} (${minimumFiat}).`;
    noticeText = (
      <>
        {t("createInvoice.lsp.msg")}
        {" \n"}
        <TextClickable style={{
          fontSize: 14,
          lineHeight: 23,
        } as TextStyle} onPress={() => navigation.navigate("DunderLspInfo")}>{t("createInvoice.lsp.msg1")}</TextClickable>
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
              : <Text>{t("createInvoice.title")}</Text>
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

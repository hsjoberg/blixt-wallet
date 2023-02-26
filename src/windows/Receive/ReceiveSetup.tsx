import React, { useState, useLayoutEffect, useEffect } from "react";
import { Button, Icon, Text, Spinner } from "native-base";
import DialogAndroid from "react-native-dialogs";
import { useDebounce } from "use-debounce";
import { StackNavigationProp } from "@react-navigation/stack";
import Long from "long";

import { ReceiveStackParamList } from "./index";
import { useStoreActions, useStoreState } from "../../state/store";
import BlixtForm from "../../components/Form";
import { formatBitcoin, BitcoinUnits, IBitcoinUnits } from "../../utils/bitcoin-units";
import { blixtTheme } from "../../native-base-theme/variables/commonColor";
import useBalance from "../../hooks/useBalance";
import { MATH_PAD_NATIVE_ID, PLATFORM } from "../../utils/constants";
import { toast } from "../../utils";
import { Keyboard } from "react-native";
import Container from "../../components/Container";
import { IFiatRates } from "../../state/Fiat";
import Input from "../../components/Input";

import { useTranslation } from "react-i18next";
import { namespaces } from "../../i18n/i18n.constants";

const MATH_PAD_HEIGHT = 44;

export interface IReceiveSetupProps {
  navigation: StackNavigationProp<ReceiveStackParamList, "ReceiveSetup">;
}
export default function ReceiveSetup({ navigation }: IReceiveSetupProps) {
  const t = useTranslation(namespaces.receive.receiveSetup).t;
  const rpcReady = useStoreState((store) => store.lightning.rpcReady);
  const syncedToChain = useStoreState((store) => store.lightning.syncedToChain);
  const invoiceSubscriptionStarted = useStoreState(
    (store) => store.receive.invoiceSubscriptionStarted,
  );
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

  const [currentlyFocusedInput, setCurrentlyFocusedInput] = useState<"bitcoin" | "fiat" | "other">(
    "other",
  );

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
    };
  });

  useLayoutEffect(() => {
    navigation.setOptions({
      headerTitle: t("layout.title"),
      headerBackTitle: t("buttons.back", { ns: namespaces.common }),
      headerShown: true,
    });
  }, [navigation]);

  const onCreateInvoiceClick = async () => {
    try {
      setCreateInvoiceDisabled(true);

      navigation.replace("ReceiveQr", {
        invoice: await addInvoice({
          sat: satoshiValue,
          description,
          tmpData: {
            payer: payer || null,
            type: "NORMAL",
            website: null,
          },
        }),
      });
    } catch (e) {
      setCreateInvoiceDisabled(false);
      toast(`${t("msg.error", { ns: namespaces.common })}: ${e.message}`, 12000, "danger", "Okay");
    }
  };

  // Bitcoin unit
  const currentBitcoinUnit = useStoreState((store) => store.settings.bitcoinUnit);
  const changeBitcoinUnit = useStoreActions((store) => store.settings.changeBitcoinUnit);
  const onPressChangeBitcoinUnit = async () => {
    if (PLATFORM === "android") {
      const { selectedItem } = await DialogAndroid.showPicker(null, null, {
        positiveText: null,
        negativeText: t("buttons.cancel", { ns: namespaces.common }),
        type: DialogAndroid.listRadio,
        selectedId: currentBitcoinUnit,
        items: [
          { label: BitcoinUnits.bitcoin.settings, id: "bitcoin" },
          { label: BitcoinUnits.bit.settings, id: "bit" },
          { label: BitcoinUnits.sat.settings, id: "sat" },
          { label: BitcoinUnits.satoshi.settings, id: "satoshi" },
          { label: BitcoinUnits.milliBitcoin.settings, id: "milliBitcoin" },
        ],
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
          { title: BitcoinUnits.sat.settings, value: "sat" },
          { title: BitcoinUnits.satoshi.settings, value: "satoshi" },
          { title: BitcoinUnits.milliBitcoin.settings, value: "milliBitcoin" },
        ],
        onPick: async (currency) => await changeBitcoinUnit(currency as keyof IBitcoinUnits),
      });
    }
  };

  // Fiat unit
  const fiatRates = useStoreState((store) => store.fiat.fiatRates);
  const currentFiatUnit = useStoreState((store) => store.settings.fiatUnit);
  const changeFiatUnit = useStoreActions((store) => store.settings.changeFiatUnit);
  const onPressChangeFiatUnit = async () => {
    if (PLATFORM === "android") {
      const { selectedItem } = await DialogAndroid.showPicker(null, null, {
        positiveText: null,
        negativeText: t("buttons.cancel", { ns: namespaces.common }),
        type: DialogAndroid.listRadio,
        selectedId: currentFiatUnit,
        items: Object.entries(fiatRates).map(([currency]) => {
          return {
            label: currency,
            id: currency,
          };
        }),
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
  };

  const formItems = [
    {
      key: "AMOUNT_SAT",
      title: `${t("form.amountBitcoin.title")} ${bitcoinUnit.nice}`,
      component: (
        <>
          <Input
            onSubmitEditing={() => setMathPadVisible(false)}
            testID="input-amount-sat"
            onChangeText={onChangeBitcoinInput}
            placeholder="0"
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
          <Icon
            type="Foundation"
            name="bitcoin-circle"
            onPress={onPressChangeBitcoinUnit}
            style={{ fontSize: 31, marginRight: 1 }}
          />
        </>
      ),
    },
    {
      key: "AMOUNT_FIAT",
      title: `${t("form.amountFiat.title")} ${fiatUnit}`,
      component: (
        <>
          <Input
            onSubmitEditing={() => setMathPadVisible(false)}
            onChangeText={onChangeFiatInput}
            placeholder="0.00"
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
    },
    {
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
    },
    {
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
    },
  ];

  const canSend =
    rpcReady &&
    invoiceSubscriptionStarted &&
    syncedToChain &&
    channels.some((channel) => channel.active) &&
    !createInvoiceDisabled;

  const loading =
    !rpcReady ||
    !invoiceSubscriptionStarted ||
    !syncedToChain ||
    createInvoiceDisabled ||
    (channels.length > 0 && !channels.some((channel) => channel.active));

  const showNoticeText = rpcReady && channels.length === 0;
  const noticeText = showNoticeText ? t("createInvoice.alert") : undefined;

  const addMathOperatorToInput = (operator: "+" | "-" | "*" | "/" | "(" | ")") => {
    if (currentlyFocusedInput === "bitcoin") {
      onChangeBitcoinInput((bitcoinValue ?? "") + operator);
    } else if (currentlyFocusedInput === "fiat") {
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
            onPress={onCreateInvoiceClick}
            disabled={!canSend}
            style={{ marginBottom: mathPadVisible && false ? MATH_PAD_HEIGHT + 5 : 0 }}
          >
            {loading ? (
              <Spinner color={blixtTheme.light} />
            ) : (
              <Text>{t("createInvoice.title")}</Text>
            )}
          </Button>,
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
}

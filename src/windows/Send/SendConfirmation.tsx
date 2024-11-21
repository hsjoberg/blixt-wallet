import React, { useEffect, useLayoutEffect, useState } from "react";
import { BackHandler, Keyboard, StyleSheet, Vibration } from "react-native";
import { Button, Container, Icon, Picker, Spinner, Text } from "native-base";
import { useDebounce } from "use-debounce";
import Long from "long";
import { useTranslation } from "react-i18next";
import { Dropdown } from "react-native-element-dropdown";
import Color from "color";

import { BitcoinUnits, unitToSatoshi } from "../../utils/bitcoin-units";
import BlixtForm, { IFormItem } from "../../components/Form";
import { hexToUint8Array, toast } from "../../utils";
import { useStoreActions, useStoreState } from "../../state/store";
import Input from "../../components/Input";
import { AMP_FEATURE_BIT, PLATFORM } from "../../utils/constants";
import { RouteProp } from "@react-navigation/native";
import { SendStackParamList } from "./index";
import { StackNavigationProp } from "@react-navigation/stack";
import { blixtTheme } from "../../native-base-theme/variables/commonColor";
import { extractDescription } from "../../utils/NameDesc";
import { lnrpc } from "../../../proto/lightning";
import { namespaces } from "../../i18n/i18n.constants";
import useBalance from "../../hooks/useBalance";
import useLightningReadyToSend from "../../hooks/useLightingReadyToSend";
import { IModelSendPaymentPayload } from "../../state/Send";

export interface ISendConfirmationProps {
  navigation: StackNavigationProp<SendStackParamList, "SendConfirmation">;
  route: RouteProp<SendStackParamList, "SendConfirmation">;
}

const choiceLabel = (n: lnrpc.IChannel) =>
  `${n.peerAlias || n.remotePubkey?.substring(0, 7)} - ${n.chanId} - ${n.localBalance}/${
    n.remoteBalance
  } `;

export default function SendConfirmation({ navigation, route }: ISendConfirmationProps) {
  const t = useTranslation(namespaces.send.sendConfirmation).t;
  const [amountEditable, setAmountEditable] = useState(false);
  const [outChannel, setOutChannel] = useState<string>("any");
  const sendPayment = useStoreActions((actions) => actions.send.sendPayment);
  const getBalance = useStoreActions((actions) => actions.channel.getBalance);
  const getChannels = useStoreState((store) => store.channel.channels).filter((n) => !!n.active);
  const nodeInfo = useStoreState((store) => store.send.remoteNodeInfo);
  const paymentRequest = useStoreState((store) => store.send.paymentRequest);
  const bolt11Invoice = useStoreState((store) => store.send.paymentRequestStr);
  const [isPaying, setIsPaying] = useState(false);
  const bitcoinUnit = useStoreState((store) => store.settings.bitcoinUnit);
  const fiatUnit = useStoreState((store) => store.settings.fiatUnit);
  const queryRoutes = useStoreActions((actions) => actions.send.queryRoutesForFeeEstimate);
  const [feeEstimate, setFeeEstimate] = useState<number | undefined>(undefined);

  const { dollarValue, bitcoinValue, onChangeFiatInput, onChangeBitcoinInput } = useBalance(
    paymentRequest?.numSatoshis,
    true,
  );
  const clear = useStoreActions((store) => store.send.clear);
  const callback = route.params?.callback ?? (() => {});
  const lightningReadyToSend = useLightningReadyToSend();
  const [bitcoinValueDebounce] = useDebounce(bitcoinValue, 1000);

  useEffect(() => {
    const backHandler = BackHandler.addEventListener("hardwareBackPress", () => {
      callback(null);
    });

    if (paymentRequest) {
      if (!paymentRequest.numSatoshis) {
        setAmountEditable(true);
      }

      if (!!paymentRequest.numSatoshis) {
        const getFeeEstimate = async () => {
          if (paymentRequest && paymentRequest.numSatoshis) {
            try {
              const { routes } = await queryRoutes({
                amount: paymentRequest.numSatoshis,
                pubKey: paymentRequest.destination,
                routeHints: paymentRequest.routeHints,
              });

              if (!!routes.length && !!routes[0].totalFees) {
                setFeeEstimate(routes[0]?.totalFees?.toNumber() ?? 0);
              }
            } catch (error) {
              console.log(error);
            }
          }
        };

        getFeeEstimate();
        setIsPaying(false);
      }
    }

    return () => {
      backHandler.remove();
      clear();
    };
  }, []);

  // This use effect executes for zero amount invoices, fetch fee estimate on amount change.
  useEffect(() => {
    if (paymentRequest && !paymentRequest.numSatoshis) {
      const getFeeEstimate = async () => {
        if (!!bitcoinValue) {
          try {
            const { routes } = await queryRoutes({
              amount: Long.fromValue(Number(bitcoinValue)),
              pubKey: paymentRequest.destination,
              routeHints: paymentRequest.routeHints,
            });

            if (!!routes.length) {
              if (routes[0].totalFees !== null && routes[0].totalFees !== undefined) {
                setFeeEstimate(routes[0]?.totalFees?.toNumber() ?? 0);
              } else {
                setFeeEstimate(0);
              }
            }
          } catch (error) {
            console.log(error);
          }
        }
      };

      getFeeEstimate();
    }
  }, [bitcoinValueDebounce]);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerTitle: t("layout.title"),
      headerBackTitle: t("buttons.back", { ns: namespaces.common }),
      headerShown: true,
    });

    // Prevent going back by swiping to the right
    // when we are here in the confirmation screen
    navigation.getParent()?.setOptions({
      gestureEnabled: false,
    });
    return () => {
      navigation.getParent()?.setOptions({
        gestureEnabled: true,
      });
    };
  }, [navigation]);

  if (!paymentRequest) {
    return <Text>{t("msg.error", { ns: namespaces.common })}</Text>;
  }

  const isAmpInvoice = paymentRequest.features.hasOwnProperty(AMP_FEATURE_BIT);

  const { name, description } = extractDescription(paymentRequest.description);

  const send = async () => {
    try {
      setIsPaying(true);
      Keyboard.dismiss();

      const payload: IModelSendPaymentPayload = {
        amount: !!amountEditable
          ? Long.fromValue(unitToSatoshi(Number.parseFloat(bitcoinValue || "0"), bitcoinUnit))
          : undefined,

        outgoingChannelId: outChannel !== "any" ? Long.fromString(outChannel) : undefined,
        isAmpInvoice,
      };

      const response = await sendPayment(payload);
      const preimage = hexToUint8Array(response.paymentPreimage);

      await getBalance();
      Vibration.vibrate(32);
      navigation.replace("SendDone", { preimage, callback });
    } catch (error) {
      console.log(error);
      toast(
        `${t("msg.error", { ns: namespaces.common })}: ${error.message}`,
        60000,
        "danger",
        "Okay",
      );
      setIsPaying(false);
    }
  };

  const formItems: IFormItem[] = [];

  formItems.push({
    key: "INVOICE",
    title: t("form.invoice.title"),
    success: true,
    component: (
      <>
        <Input
          disabled={true}
          style={{ fontSize: 13, marginTop: 4 }}
          value={`${bolt11Invoice!.substring(0, 29).toLowerCase()}...`}
        />
        <Icon name="checkmark-circle" />
      </>
    ),
  });

  formItems.push({
    key: "AMOUNT_BTC",
    title: `${t("form.amount.title")} ${BitcoinUnits[bitcoinUnit].nice}`,
    component: (
      <Input
        disabled={!amountEditable}
        onChangeText={(amountEditable && onChangeBitcoinInput) || undefined}
        placeholder="0"
        value={bitcoinValue}
        keyboardType="numeric"
        returnKeyType="done"
      />
    ),
  });

  formItems.push({
    key: "AMOUNT_FIAT",
    title: `${t("form.amount.title")} ${fiatUnit}`,
    component: (
      <Input
        disabled={!amountEditable}
        onChangeText={(amountEditable && onChangeFiatInput) || undefined}
        placeholder="0.00"
        value={dollarValue}
        keyboardType="numeric"
        returnKeyType="done"
      />
    ),
  });

  if (name) {
    formItems.push({
      key: "RECIPIENT",
      title: t("form.recipient.title"),
      component: <Input disabled={true} value={name} />,
    });
  } else if (nodeInfo && nodeInfo.node && nodeInfo.node.alias) {
    formItems.push({
      key: "NODE_ALIAS",
      title: t("form.nodeAlias.title"),
      component: <Input disabled={true} value={nodeInfo.node.alias} />,
    });
  }

  formItems.push({
    key: "MESSAGE",
    title: t("form.description.title"),
    component: <Input multiline={PLATFORM === "android"} disabled={true} value={description} />,
  });

  if (feeEstimate !== undefined) {
    formItems.push({
      key: "FEE_ESTIMATE",
      title: t("form.feeEstimate.title"),
      component: <Input disabled={true} value={feeEstimate.toString()} />,
    });
  }

  if (getChannels !== undefined && !!getChannels.length) {
    const dropdownData = [
      {
        label: "Any",
        value: "any",
      } as { label: string; value: string },
    ].concat(
      getChannels.map((n, i) => ({
        label: choiceLabel(n),
        value: n.chanId?.toString() ?? "any",
      })),
    );

    if (PLATFORM !== "macos") {
      // TODO(hsjoberg): cleanup styles
      formItems.push({
        key: "CHANNEL",
        title: t("form.outgoingChannel.title"),
        component: (
          <Dropdown
            labelField="label"
            valueField="value"
            data={dropdownData}
            fontFamily={
              PLATFORM === "ios" || PLATFORM === "macos" ? "IBMPlexSans" : "IBMPlexSans-Regular"
            }
            value={outChannel}
            selectedTextProps={{
              numberOfLines: 1,
              lineBreakMode: "tail",
              style: {
                fontFamily:
                  PLATFORM === "ios" || PLATFORM === "macos"
                    ? "IBMPlexSans"
                    : "IBMPlexSans-Regular",
                fontSize: 17,
                color: blixtTheme.light,
              },
            }}
            onChange={(n) => setOutChannel(n.value?.toString() ?? "any")}
            maxHeight={250}
            style={styles.dropdown}
            containerStyle={{
              borderWidth: 0,
              backgroundColor: blixtTheme.gray,
            }}
            itemContainerStyle={{
              borderWidth: 0,
              backgroundColor: blixtTheme.gray,
            }}
            itemTextStyle={{
              fontSize: 13,
              lineHeight: 18,
              color: blixtTheme.light,
            }}
            activeColor={Color(blixtTheme.gray).lighten(0.3).hex()}
          />
        ),
      });
    }
  }

  const canSend = lightningReadyToSend && !isPaying;

  return (
    <Container>
      <BlixtForm
        items={formItems}
        buttons={[
          <Button
            key="PAY"
            testID="pay-invoice"
            block={true}
            primary={true}
            onPress={send}
            disabled={
              !canSend ||
              (amountEditable
                ? bitcoinValue === "0" || bitcoinValue === "" || bitcoinValue === undefined
                : false)
            }
          >
            {canSend && <Text>Pay</Text>}
            {!canSend && <Spinner color={blixtTheme.light} />}
          </Button>,
        ]}
      />
    </Container>
  );
}

const styles = StyleSheet.create({
  dropdown: {
    flex: 1,
    marginBottom: 8,
    marginLeft: 5,
    marginRight: 6,
    minHeight: 60,
  },
  icon: {
    marginRight: 5,
  },
  iconStyle: {
    width: 20,
    height: 20,
  },
});

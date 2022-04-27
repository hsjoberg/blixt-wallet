import React, { useState } from "react";
import { Vibration, Keyboard, Image } from "react-native";
import { Text, View, Button, Input } from "native-base";
import Long from "long";
import { useNavigation } from "@react-navigation/core";

import { useStoreState, useStoreActions } from "../../../state/store";
import { toast, getDomainFromURL, hexToUint8Array } from "../../../utils";
import { ILNUrlPayRequest, ILNUrlPayRequestMetadata, ILNUrlPayResponsePayerData } from "../../../state/LNURL";
import ScaledImage from "../../../components/ScaledImage";
import { formatBitcoin, convertBitcoinToFiat } from "../../../utils/bitcoin-units";
import ButtonSpinner from "../../../components/ButtonSpinner";
import style from "./style";
import useLightningReadyToSend from "../../../hooks/useLightingReadyToSend";
import { identifyService, lightningServices } from "../../../utils/lightning-services";
import { Alert } from "../../../utils/alert";
import { setupDescription } from "../../../utils/NameDesc";
import useBalance from "../../../hooks/useBalance";
import { PayerData } from "./PayerData";

import { useTranslation } from "react-i18next";
import { namespaces } from "../../../i18n/i18n.constants";

export interface IPaymentCardProps {
  onPaid: (preimage: Uint8Array) => void;
  lnUrlObject: ILNUrlPayRequest;
  callback?: (r: Uint8Array | null) => void;
}

export default function PaymentCard({ onPaid, lnUrlObject, callback }: IPaymentCardProps) {
  const t = useTranslation(namespaces.LNURL.LNURLPayRequest).t;
  const navigation = useNavigation();
  const lightningReadyToSend = useLightningReadyToSend();

  const [doRequestLoading, setDoRequestLoading] = useState(false);

  const doPayRequest = useStoreActions((store) => store.lnUrl.doPayRequest);
  const lnurlStr = useStoreState((store) => store.lnUrl.lnUrlStr);

  const currentRate = useStoreState((store) => store.fiat.currentRate);
  const sendPayment = useStoreActions((actions) => actions.send.sendPayment);
  const getBalance = useStoreActions((actions) => actions.channel.getBalance);
  const [comment, setComment] = useState<string | undefined>();
  const minSpendable = lnUrlObject?.minSendable;
  const maxSpendable = lnUrlObject?.maxSendable;
  const commentAllowed = lnUrlObject.commentAllowed ?? undefined;
  const domain = getDomainFromURL(lnurlStr ?? "");
  const name = useStoreState((store) => store.settings.name);
  const [sendName, setSendName] = useState<boolean | undefined>(lnUrlObject.commentAllowed !== undefined ? false : undefined);
  const preferFiat = useStoreState((store) => store.settings.preferFiat);
  const changePreferFiat = useStoreActions((store) => store.settings.changePreferFiat);
  const {
    dollarValue,
    bitcoinValue,
    satoshiValue,
    onChangeFiatInput,
    onChangeBitcoinInput,
    bitcoinUnit,
    fiatUnit,
  } = useBalance();

  try {
    const metadata = JSON.parse(lnUrlObject.metadata) as ILNUrlPayRequestMetadata;
    const payerData = lnUrlObject.payerData;
    const payerDataName = payerData?.name ?? null;

    console.log(metadata);

    const text = metadata.find((m, i) => {
      return m[0]?.toLowerCase?.() === "text/plain";
    })?.[1];

    if (!text) {
      throw new Error(t("payloadErrors.error1"));
    }

    const longDesc = metadata.find((m, i) => {
      return m[0]?.toLowerCase?.() === "text/long-desc";
    })?.[1];

    const imageData = metadata.filter((m, i) => {
      return m[0]?.toLowerCase?.()?.startsWith("image");
    })?.[0];
    const image = imageData?.[1];
    const imageMimeType = imageData?.[0];

    const lightningAddress = metadata?.find((item) => item[0]?.toLowerCase?.() === "text/identifier" || item[0]?.toLowerCase?.() === "text/email");

    const cancel = () => {
      callback?.(null);
      navigation.pop();
    };

    const onPressPay = async () => {
      if (!payerDataName && commentAllowed && sendName && !comment) {
        Alert.alert("", t("pay.error.mustProvideComment"));
        return;
      }

      try {
        let c = comment;
        if (!payerDataName && c && c.length > 0 && sendName && name) {
          c = setupDescription(c, name);
        }

        let sendPayerData = false;
        const payerData: ILNUrlPayResponsePayerData = {};
        if (payerDataName) {
          if (payerDataName.mandatory) {
            sendPayerData = true;
            payerData.name = name ?? "Anonymous";
          } else if (sendName) {
            sendPayerData = true;
            payerData.name = name ?? "";
          }
        }

        const amountMsat = minSpendable !== maxSpendable
          ? satoshiValue * 1000
          : minSpendable;

        Keyboard.dismiss();
        setDoRequestLoading(true);
        const paymentRequestResponse = await doPayRequest({
          msat: amountMsat,
          comment: c,
          lightningAddress: lightningAddress?.[1] ?? null,
          lud16IdentifierMimeType: lightningAddress?.[0] ?? null,
          metadataTextPlain: text ?? "Invoice description missing",
          payerData: sendPayerData ? payerData : undefined,
        });
        console.log(paymentRequestResponse);
        const response = await sendPayment();
        const preimage = hexToUint8Array(response.paymentPreimage);

        await getBalance();
        Vibration.vibrate(32);
        onPaid(preimage);
      } catch (e) {
        Vibration.vibrate(50);
        toast(
          "Error: " + e.message,
          12000,
          "danger",
          "Okay"
        );
      }
      setDoRequestLoading(false);
    }

    const onPressCurrencyButton = async () => {
      await changePreferFiat(!preferFiat);
    }

    const minSpendableFormatted = formatBitcoin(Long.fromValue(minSpendable ?? 0).div(1000), bitcoinUnit.key);
    const minSpendableFiatFormatted = convertBitcoinToFiat(Long.fromValue(minSpendable ?? 0).div(1000), currentRate) + " " + fiatUnit;

    const maxSpendableFormatted = formatBitcoin(Long.fromValue(maxSpendable ?? 0).div(1000), bitcoinUnit.key);
    const maxSpendableFiatFormatted = convertBitcoinToFiat(Long.fromValue(maxSpendable ?? 0).div(1000), currentRate) + " " + fiatUnit;

    const serviceKey = identifyService(null, "", domain);
    let service;
    if (serviceKey && lightningServices[serviceKey]) {
      service = lightningServices[serviceKey];
    }

    return (
      <>
        {/* <View style={style.contentContainer}> */}
          <View style={{ flexDirection: "row" }}>
            {service &&
              <Image
                source={{ uri: service.image }}
                style={{
                  borderRadius: 24,
                  marginRight: 10,
                  marginLeft: 3,
                  marginTop: -2.5,
                }}
                width={26}
                height={26}
              />
            }
            <Text style={style.text}>
              <Text style={style.boldText}>{domain}</Text> {t("form.asksYouToPay")}
            </Text>
          </View>
          <Text style={style.text}>
            <Text style={style.boldText}>{t("form.description.title")}:</Text>{"\n"}
            {longDesc || text}
          </Text>
          <Text style={style.inputLabel}>
            <Text style={style.boldText}>{t("form.amount.title")}:</Text>{"\n"}
            {minSpendableFormatted} ({minSpendableFiatFormatted})
            {(minSpendable !== maxSpendable) &&
              <Text>{" "}{t("form.amount.to")} {maxSpendableFormatted} ({maxSpendableFiatFormatted})</Text>
            }
          </Text>
          {minSpendable !== maxSpendable &&
            <View style={style.inputAmountContainer}>
              <Input
                onChangeText={preferFiat ?  onChangeFiatInput : onChangeBitcoinInput}
                keyboardType="numeric"
                returnKeyType="done"
                placeholder={`${t("form.amount.placeholder")} (${preferFiat ? fiatUnit : bitcoinUnit.nice})`}
                style={[style.input]}
                value={preferFiat ? dollarValue : bitcoinValue}
              />
              <Button
                small
                style={style.inputCurrencyButton}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                onPress={onPressCurrencyButton}
              >
                <Text style={{fontSize: 10 }}>
                  {preferFiat && <>{fiatUnit}</>}
                  {!preferFiat && <>{bitcoinUnit.nice}</>}
                </Text>
              </Button>
            </View>
          }
          {(payerData || typeof commentAllowed === "number" && commentAllowed > 0) &&
            <PayerData
              commentAllowed={commentAllowed}
              domain={domain}
              name={name}
              payerDataName={payerDataName}
              sendName={sendName}
              setComment={setComment}
              setSendName={setSendName}
            />
          }
          {image &&
            <ScaledImage
              uri={`data:${imageMimeType},` + image}
              height={160}
              style={{
                alignSelf: "center",
                marginBottom: 32,
              }}
            />
          }
        {/* </View> */}
        <View style={[style.actionBar, { flexGrow: 1 }]}>
          <Button
            success
            disabled={!lightningReadyToSend || doRequestLoading || (minSpendable !== maxSpendable ? satoshiValue <= 0 : false)}
            onPress={onPressPay}
            style={{
              marginLeft: 10,
              width: 53,
              justifyContent: "center",
            }}
            small={true}
          >
            {(!doRequestLoading && lightningReadyToSend) ? <Text>{t("pay.title")}</Text> : <ButtonSpinner />}
          </Button>
          <Button
            onPress={cancel}
            style={{
              marginRight: 10,
            }}
            danger
            small={true}
          >
            <Text>{t("cancel.title")}</Text>
          </Button>
        </View>
      </>
    );
  } catch (error) {
    Alert.alert(`${t("form.alert")}:\n\n${error.message}`);
    callback?.(null);
    navigation.goBack();
    return (<></>)
  }
}

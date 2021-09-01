import React, { useState } from "react";
import { Vibration, Keyboard } from "react-native";
import { Text, View, Button, Input } from "native-base";
import Long from "long";
import { useNavigation } from "@react-navigation/core";

import { useStoreState, useStoreActions } from "../../../state/store";
import { toast, getDomainFromURL, hexToUint8Array } from "../../../utils";
import { ILNUrlPayRequest, ILNUrlPayRequestMetadata, ILNUrlPayResponse } from "../../../state/LNURL";
import ScaledImage from "../../../components/ScaledImage";
import { formatBitcoin, convertBitcoinToFiat, unitToSatoshi } from "../../../utils/bitcoin-units";
import ButtonSpinner from "../../../components/ButtonSpinner";
import style from "./style";
import useLightningReadyToSend from "../../../hooks/useLightingReadyToSend";

export interface IPaymentCardProps {
  onPaid: (preimage: Uint8Array) => void;
  lnUrlObject: ILNUrlPayRequest;
}

export default function PaymentCard({ onPaid, lnUrlObject }: IPaymentCardProps) {
  const navigation = useNavigation();
  const lightningReadyToSend = useLightningReadyToSend();

  const [doRequestLoading, setDoRequestLoading] = useState(false);

  const doPayRequest = useStoreActions((store) => store.lnUrl.doPayRequest);
  const clear = useStoreActions((store) => store.lnUrl.clear);
  const lnurlStr = useStoreState((store) => store.lnUrl.lnUrlStr);

  const bitcoinUnit = useStoreState((store) => store.settings.bitcoinUnit);
  const fiatUnit = useStoreState((store) => store.settings.fiatUnit);
  const currentRate = useStoreState((store) => store.fiat.currentRate);
  const multiPathPaymentsEnabled = useStoreState((store) => store.settings.multiPathPaymentsEnabled);
  const sendPayment = useStoreActions((actions) => actions.send.sendPayment);
  const sendPaymentOld = useStoreActions((actions) => actions.send.sendPaymentOld);
  const getBalance = useStoreActions((actions) => actions.channel.getBalance);
  const [comment, setComment] = useState<string | undefined>();
  const minSpendable = lnUrlObject?.minSendable;
  const maxSpendable = lnUrlObject?.maxSendable;
  const commentAllowed = lnUrlObject.commentAllowed ?? undefined;
  const [sendAmountMSat, setSendAmountMSat] = useState(minSpendable === maxSpendable ? lnUrlObject?.minSendable : 0);
  const domain = getDomainFromURL(lnurlStr ?? "");

  const metadata = JSON.parse(lnUrlObject.metadata) as ILNUrlPayRequestMetadata;

  const text = metadata.find((m, i) => {
    return m[0]?.toLowerCase?.() === "text/plain";
  })?.[1];

  // TODO error if text/plain is missing

  const longDesc = metadata.find((m, i) => {
    return m[0]?.toLowerCase?.() === "text/long-desc";
  })?.[1];

  const image = metadata.filter((m, i) => {
    return m[0]?.toLowerCase?.()?.startsWith("image");
  })?.[0]?.[1];

  const lightningAddress = metadata?.find((item) => item[0]?.toLowerCase?.() === "text/identifier" || item[0]?.toLowerCase?.() === "text/email");

  const cancel = () => {
    clear();
    navigation.pop();
  };

  const onChangeBitcoinInput = (newText: string) => {
    const msat = unitToSatoshi(Number.parseFloat(newText.replace(/,/g, ".")), bitcoinUnit) * 1000;
    setSendAmountMSat(msat);
  };

  const onPressPay = async () => {
    try {
      Keyboard.dismiss();
      setDoRequestLoading(true);
      const paymentRequestResponse = await doPayRequest({
        msat: sendAmountMSat,
        comment,
        lightningAddress: lightningAddress?.[1] ?? null,
        lud16IdentifierMimeType: lightningAddress?.[0] ?? null,
        metadataTextPlain: text ?? "Invoice description missing",
      });
      console.log(paymentRequestResponse);

      let preimage: Uint8Array;

      if (multiPathPaymentsEnabled) {
        try {
          console.log("Paying with MPP enabled");
          const response = await sendPayment();
          preimage = hexToUint8Array(response.paymentPreimage);
        } catch (e) {
          console.log("Didn't work. Trying without instead");
          console.log(e);
          console.log("Paying with MPP disabled");
          const response = await sendPaymentOld();
          preimage = response.paymentPreimage;
        }
      }
      else {
        console.log("Paying with MPP disabled");
        const response = await sendPaymentOld();
        preimage = response.paymentPreimage;
      }
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

  const minSpendableFormatted = formatBitcoin(Long.fromValue(minSpendable ?? 0).div(1000), bitcoinUnit);
  const minSpendableFiatFormatted = convertBitcoinToFiat(Long.fromValue(minSpendable ?? 0).div(1000), currentRate) + " " + fiatUnit;

  const maxSpendableFormatted = formatBitcoin(Long.fromValue(maxSpendable ?? 0).div(1000), bitcoinUnit);
  const maxSpendableFiatFormatted = convertBitcoinToFiat(Long.fromValue(maxSpendable ?? 0).div(1000), currentRate) + " " + fiatUnit;

  return (
    <>
      <View style={style.contentContainer}>
        <Text style={style.text}>
          <Text style={style.boldText}>{domain}</Text> asks you to pay.
        </Text>
        <Text style={style.text}>
          <Text style={style.boldText}>Description:</Text>{"\n"}
          {longDesc || text}
        </Text>
        <Text style={{ marginBottom: 28 }}>
          <Text style={style.boldText}>Price:</Text>{"\n"}
          {minSpendableFormatted} ({minSpendableFiatFormatted})
          {(minSpendable !== maxSpendable) &&
            <Text> to {maxSpendableFormatted} ({maxSpendableFiatFormatted})</Text>
          }
        </Text>
        {typeof commentAllowed === "number" && commentAllowed > 0 &&
          <>
            <Text>
              Comment to <Text style={style.boldText}>{domain}</Text> (max {commentAllowed} letters):
            </Text>
            <View style={{ flexDirection:"row" }}>
              <Input onChangeText={setComment} keyboardType="default" style={[style.input, { marginTop: 9, marginBottom: 16 }]} />
            </View>
          </>
        }
        {image &&
          <ScaledImage
            uri={"data:image/png;base64," + image}
            height={185}
            style={{
              alignSelf: "center",
              marginBottom: 28,
            }}
          />
        }
      </View>
      <View style={style.actionBar}>
        <Button
          success
          disabled={!lightningReadyToSend || doRequestLoading || !(sendAmountMSat > 0)}
          onPress={onPressPay}
          style={{
            marginLeft: 10,
            width: 53,
            justifyContent: "center",
          }}
          small={true}
        >
          {(!doRequestLoading && lightningReadyToSend) ? <Text>Pay</Text> : <ButtonSpinner />}
        </Button>
        {minSpendable !== maxSpendable &&
          <Input
            onChangeText={onChangeBitcoinInput}
            keyboardType="numeric"
            returnKeyType="done"
            placeholder={`Input amount`}
            style={style.input}
          />
        }
        <Button
          onPress={cancel}
          style={{
            marginRight: 10,
          }}
          danger
          small={true}
        >
          <Text>Cancel</Text>
        </Button>
      </View>
    </>
  );
}

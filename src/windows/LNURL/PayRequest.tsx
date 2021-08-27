import React, { useEffect, useState } from "react";
import { Vibration, StyleSheet, Linking, Alert, Keyboard, KeyboardAvoidingView } from "react-native";
import Clipboard from "@react-native-community/clipboard"
import { Body, Card, Text, CardItem, H1, View, Button, Input, Spinner } from "native-base";
import { StackNavigationProp } from "@react-navigation/stack";
import Long from "long";

import { blixtTheme } from "../../native-base-theme/variables/commonColor";
import { useStoreState, useStoreActions } from "../../state/store";
import { RootStackParamList } from "../../Main";
import { toast, getDomainFromURL, decryptLNURLPayAesTagMessage, hexToUint8Array } from "../../utils";
import Blurmodal from "../../components/BlurModal";
import { ILNUrlPayRequestMetadata, ILNUrlPayResponse } from "../../state/LNURL";
import ScaledImage from "../../components/ScaledImage";
import Color from "color";
import { formatBitcoin, convertBitcoinToFiat, unitToSatoshi } from "../../utils/bitcoin-units";
import TextLink from "../../components/TextLink";
import { Done } from "../Send/SendDone";

export interface IPayRequestProps {
  navigation: StackNavigationProp<RootStackParamList>;
  route: any;

}
export default function LNURLPayRequest({ navigation, route }: IPayRequestProps) {
  const [doRequestLoading, setDoRequestLoading] = useState(false);

  const [paid, setPaid] = useState(false);
  const type = useStoreState((store) => store.lnUrl.type);
  const doPayRequest = useStoreActions((store) => store.lnUrl.doPayRequest);
  const clear = useStoreActions((store) => store.lnUrl.clear);
  const lnurlStr = useStoreState((store) => store.lnUrl.lnUrlStr);
  const lnUrlObject = useStoreState((store) => store.lnUrl.lnUrlObject);

  const bitcoinUnit = useStoreState((store) => store.settings.bitcoinUnit);
  const fiatUnit = useStoreState((store) => store.settings.fiatUnit);
  const currentRate = useStoreState((store) => store.fiat.currentRate);
  const multiPathPaymentsEnabled = useStoreState((store) => store.settings.multiPathPaymentsEnabled);
  const sendPayment = useStoreActions((actions) => actions.send.sendPayment);
  const sendPaymentOld = useStoreActions((actions) => actions.send.sendPaymentOld);

  const [metadata, setMetadata] = useState<ILNUrlPayRequestMetadata>();
  const [domain, setDomain] = useState("");
  const [text, setText] = useState("");
  const [image, setImage] = useState<string | undefined>();
  const [minSpendable, setMinSpendable] = useState<number | undefined>();
  const [maxSpendable, setMaxSpendable] = useState<number | undefined>();
  const [commentAllowed, setCommentAllowed] = useState<number | undefined>();
  const [payRequestResponse, setPayRequestResponse] = useState<ILNUrlPayResponse | undefined>();
  const [preimage, setPreimage] = useState<Uint8Array | undefined>();

  const [sendAmountMSat, setSendAmountMSat] = useState(0);
  const [comment, setComment] = useState<string | undefined>();

  useEffect(() => {
    if (lnUrlObject && lnUrlObject.tag === "payRequest") {
      setDomain(getDomainFromURL(lnurlStr!))

      const metadata = JSON.parse(lnUrlObject.metadata) as ILNUrlPayRequestMetadata;
      setMetadata(metadata);

      const metaDataText = metadata.find((m, i) => {
        return !!m.find((str) => str === "text/plain");
      });
      if (metaDataText) {
        setText(metaDataText[1]);
      }

      const metaDataImage = metadata.filter((m, i) => {
        return !!m.find((str) => str.toUpperCase().startsWith("IMAGE"));
      });
      if (metaDataImage[0]) {
        setImage(metaDataImage[0][1]);
      }

      setMinSpendable(lnUrlObject.minSendable);
      setMaxSpendable(lnUrlObject.maxSendable);
      setCommentAllowed(lnUrlObject.commentAllowed ?? undefined)

      if (lnUrlObject.minSendable === lnUrlObject.maxSendable) {
        setSendAmountMSat(lnUrlObject.minSendable);
      }
    }
  }, [lnUrlObject]);

  const cancel = () => {
    clear();
    navigation.pop();
  };

  const viewMetadata = () => {
    Alert.alert("Technical metadata", JSON.stringify(metadata, undefined, 2));
  }

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
      });
      console.log(paymentRequestResponse);
      setPayRequestResponse(paymentRequestResponse);

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

      setPreimage(preimage);
      setPaid(true);
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

  if (paid && payRequestResponse) {
    const onPressCopyUrltoClipboard = () => {
      if (payRequestResponse.successAction?.tag === "url") {
        Clipboard.setString(payRequestResponse.successAction.url);
        toast("Copied to clipboard.", undefined, "warning")
      }
    };

    const onPressOpenUrlInBrowser = async () => {
      if (payRequestResponse.successAction?.tag === "url") {
        await Linking.openURL(payRequestResponse.successAction.url);
      }
    };

    return (
      <Blurmodal useModalComponent={false} goBackByClickingOutside={false}>
        <Card style={style.card}>
          <CardItem style={{ flexGrow: 1 }}>
            <Body style={{ flex: 1 }}>
              <H1 style={style.header}>
                Invoice paid
              </H1>
              {!payRequestResponse.successAction && (
                <View style={{ flex: 1, width:"100%", justifyContent: "center", alignItems:"center" }}>
                  <Done />
                </View>
              )}
              {payRequestResponse.successAction?.tag === "message" &&
                <>
                  <Text>
                    Message from {domain}:{"\n"}
                    {payRequestResponse.successAction.message}
                  </Text>
                </>
              }
              {payRequestResponse.successAction?.tag === "url" &&
                <>
                  <Text style={style.text}>
                    Description:{"\n"}
                    {payRequestResponse.successAction.description}
                  </Text>
                  <Text style={style.text}>
                    URL received from {domain}:{"\n"}
                    <TextLink url={payRequestResponse.successAction.url}>
                      {payRequestResponse.successAction.url}
                    </TextLink>
                  </Text>
                </>
              }
              {payRequestResponse.successAction?.tag === "aes" &&
                <>
                  <Text style={style.text}>Got a secret encrypted message from {domain}.</Text>
                  <Text style={style.text}>
                    Message from {domain}:{"\n"}
                    {payRequestResponse.successAction.description}
                  </Text>
                  <Text style={style.text}>
                    Secret message:{"\n"}
                    {(() => {
                      if (payRequestResponse.successAction?.tag === "aes") {
                        return decryptLNURLPayAesTagMessage(
                          preimage!,
                          payRequestResponse.successAction.iv,
                          payRequestResponse.successAction.ciphertext,
                        );
                      }
                    })()}
                  </Text>
                </>
              }
              <View style={[style.actionBar, { justifyContent: undefined }]}>
                <Button onPress={cancel} small={true}>
                  <Text style={{ fontSize:10 }}>Done</Text>
                </Button>
                {payRequestResponse.successAction?.tag === "url" &&
                  <>
                    <Button
                      onPress={onPressCopyUrltoClipboard}
                      small
                      style={{ marginRight: 12 }}
                    >
                      <Text style={{ fontSize:10 }}>Copy to clipboard</Text>
                    </Button>
                    <Button
                      onPress={onPressOpenUrlInBrowser}
                      small
                      style={{ marginRight: 12 }}
                    >
                      <Text style={{ fontSize:10 }}>Open Browser</Text>
                    </Button>
                  </>
                }
              </View>
            </Body>
          </CardItem>
        </Card>
      </Blurmodal>
    );
  }

  if (domain === "") {
    return (
      <></>
    );
  }

  const lightningAddress = metadata?.find((item) => item[0] === "text/identifier" || item[0] === "text/email");

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior="height">
      <Blurmodal useModalComponent={false} goBackByClickingOutside={false}>
        {__DEV__ &&
          <View style={{ position:"absolute", top: -30, right: 0 }}>
            <Button small={true} onPress={viewMetadata}>
              <Text style={{ fontSize: 7.5 }}>View metadata</Text>
            </Button>
          </View>
        }
        <Card style={style.card}>
          <CardItem style={{ flexGrow: 1 }}>
            <Body>
              <View style={style.headerContainer}>
                <H1 style={style.header}>
                  Pay
                </H1>
                {lightningAddress && <Text>{lightningAddress[1]}</Text>}
              </View>
              <View style={style.contentContainer}>
                <Text style={style.text}>
                  {domain} asks you to pay.
                </Text>
                <Text style={style.text}>
                  Description:{"\n"}
                  {text}
                </Text>
                <Text style={{ marginBottom: 28 }}>
                  Price:{"\n"}
                  {minSpendableFormatted} ({minSpendableFiatFormatted})
                  {(minSpendable !== maxSpendable) &&
                    <Text> to {maxSpendableFormatted} ({maxSpendableFiatFormatted})</Text>
                  }
                </Text>
                {typeof commentAllowed === "number" && commentAllowed > 0 &&
                  <>
                    <Text>
                      Comment to {domain} (max {commentAllowed} letters):
                    </Text>
                    <View style={{ flexDirection:"row" }}>
                      <Input onChangeText={setComment} keyboardType="default" style={[style.input, { marginTop: 9, marginBottom: 16 }]} />
                    </View>
                  </>
                }
                {image &&
                  <ScaledImage
                    uri={"data:image/png;base64," + image}
                    height={190}
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
                  disabled={doRequestLoading || !(sendAmountMSat > 0)}
                  onPress={onPressPay}
                  style={{
                    marginLeft: 10,
                    width: 52

                  }}
                  small={true}
                >
                  {!doRequestLoading && <Text>Pay</Text>}
                  {doRequestLoading && <Spinner style={{ flex:1 }} size={26} color={blixtTheme.light} />}
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
            </Body>
          </CardItem>
        </Card>
      </Blurmodal>
    </KeyboardAvoidingView>
  );
}

const style = StyleSheet.create({
  card: {
    padding: 5,
    width: "100%",
    minHeight: "55%",
  },
  headerContainer: {
    display: "flex",
    marginBottom: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems:"center",
    width: "100%"
  },
  header: {
    fontWeight: "bold",
  },
  contentContainer: {
    flexGrow: 1,
  },
  actionBar: {
    width: "100%",
    alignItems:"flex-end",
    justifyContent:"space-between",
    flexDirection: "row-reverse",
  },
  text: {
    marginBottom: 14,
  },
  iconText: {
  },
  icon: {
    fontSize: 18,
  },
  input: {
    flexGrow: 1,
    flexBasis: "auto",
    height: 28,
    fontSize: 13,
    backgroundColor: Color(blixtTheme.gray).lighten(0.28).hex(),
    borderRadius: 32,
    paddingTop: 5,
    paddingBottom: 5,
    paddingLeft: 12,
    paddingRight: 8,
  }
});

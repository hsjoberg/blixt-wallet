import React, { useEffect, useState } from "react";
import { StatusBar, Vibration, StyleSheet, Image, Clipboard, Linking, KeyboardAvoidingView } from "react-native";
import { Body, Card, Text, CardItem, H1, Toast, View, Button, Input, Icon, Spinner } from "native-base";
import { StackNavigationProp } from "@react-navigation/stack";
import DialogAndroid from "react-native-dialogs";
import Long from "long";
import aesjs from "aes-js";
import * as base64 from "base64-js";

import Container from "../../components/Container";
import { blixtTheme } from "../../../native-base-theme/variables/commonColor";
import { useStoreState, useStoreActions } from "../../state/store";
import { RootStackParamList } from "../../Main";
import { toast, getDomainFromURL, uint8ArrayToString, decryptLNURLPayAesTagMessage } from "../../utils";
import Blurmodal from "../../components/BlurModal";
import { ILNUrlPayRequestMetadata, ILNUrlPayResponse } from "../../state/LNURL";
import ScaledImage from "../../components/ScaledImage";
import Color from "color";
import { formatBitcoin, convertBitcoinToFiat, unitToSatoshi } from "../../utils/bitcoin-units";
import TextLink from "../../components/TextLink";
import { Debug } from "../../utils/build";

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

  const [metadata, setMetadata] = useState<ILNUrlPayRequestMetadata>();
  const [domain, setDomain] = useState("");
  const [text, setText] = useState("");
  const [image, setImage] = useState<string | undefined>();
  const [minSpendable, setMinSpendable] = useState<number | undefined>();
  const [maxSpendable, setMaxSpendable] = useState<number | undefined>();
  const [payRequestResponse, setPayRequestResponse] = useState<ILNUrlPayResponse | undefined>();
  const [preimage, setPreimage] = useState<Uint8Array | undefined>();

  const [sendAmountMSat, setSendAmountMSat] = useState(0);

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
        return !!m.find((str) => str.toUpperCase().startsWith( "IMAGE"));
      });
      if (metaDataImage[0]) {
        setImage(metaDataImage[0][1]);
      }

      setMinSpendable(lnUrlObject.minSendable);
      setMaxSpendable(lnUrlObject.maxSendable);

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
    DialogAndroid.alert("Technical metadata", JSON.stringify(metadata, undefined, 2));
  }

  const onChangeBitcoinInput = (newText: string) => {
    const msat = unitToSatoshi(Number.parseFloat(newText), bitcoinUnit) * 1000;
    setSendAmountMSat(msat);
  };

  const onPressPay = async () => {
    try {
      setDoRequestLoading(true);
      const response = await doPayRequest({
        msat: sendAmountMSat,
      });
      console.log(response);
      setPayRequestResponse(response);

      navigation.navigate("Send", {
        screen: "SendConfirmation",
        params: {
          callback: (paymentPreimage: Uint8Array) => {
            if (paymentPreimage !== null) {
              setPreimage(paymentPreimage);
              setPaid(true);
            }
          }
        }
      });
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
        Toast.show({
          text: "Copied to clipboard.",
          type: "warning",
        });
      }
    };

    const onPressOpenUrlInBrowser = async () => {
      if (payRequestResponse.successAction?.tag === "url") {
        await Linking.openURL(payRequestResponse.successAction.url);
      }
    };

    return (
      <Blurmodal useModalComponent={false}>
        <View style={style.container}>
          <Card style={style.card}>
            <CardItem style={{ flexGrow: 1 }}>
              <Body>
                <H1 style={style.header}>
                  Invoice paid
                </H1>
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

                          // const aesCbc = new aesjs.ModeOfOperation.cbc(
                          //   preimage!,
                          //   base64.toByteArray(payRequestResponse.successAction.iv)
                          // );

                          // const msg = aesCbc.decrypt(
                          //   base64.toByteArray(payRequestResponse.successAction.ciphertext)
                          // )
                          // return uint8ArrayToString(msg);
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
        </View>
      </Blurmodal>
    );
  }

  return (
    <Blurmodal useModalComponent={false}>
      <View style={style.container}>
        <Card style={style.card}>
          <CardItem style={{ flexGrow: 1 }}>
            <Body>
              <View style={{ display: "flex", flexDirection: "row", justifyContent: "space-between", width: "100%" }}>
                <H1 style={style.header}>
                  Pay
                </H1>
                {__DEV__ &&
                  <Button small={true} onPress={viewMetadata}>
                    <Text style={{ fontSize: 7.5 }}>View technical metadata</Text>
                  </Button>
                }
              </View>
              <Text style={style.text}>
                {domain} asks you to pay for a product.
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
              {image &&
                <ScaledImage
                  uri={"data:image/png;base64," + image}
                  height={200}
                  style={{
                    alignSelf: "center",
                    marginBottom: 28,
                  }}
                />
              }
              <View style={style.actionBar}>
                <Button
                  disabled={doRequestLoading}
                  success
                  onPress={onPressPay}
                  style={{
                    marginLeft: 10,
                    width: 58,
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
                    placeholder={`${minSpendableFormatted} to ${maxSpendableFormatted}`}
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
      </View>
    </Blurmodal>
  );
}

const style = StyleSheet.create({
  blurOverlay: {
    flex: 1,
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  container: {
    width:"100%",
    padding: 12,
    flex: 1,
    justifyContent: "center"
  },
  card: {
    padding: 5,
    width: "100%",
    minHeight: "55%",
  },
  header: {
    fontWeight: "bold",
    marginBottom: 10,
  },
  detailText: {
    marginBottom: 7,
  },
  qrText: {
    marginBottom: 7,
    paddingTop: 4,
    paddingLeft: 18,
    paddingRight: 18,
  },
  actionBar: {
    width: "100%",
    flexGrow: 1,
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
    flexShrink: 1,
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
import React, { useEffect, useState } from "react";
import { KeyboardAvoidingView } from "react-native";
import { Body, Card, Text, CardItem, H1, View, Button, Icon } from "native-base";
import { StackNavigationProp } from "@react-navigation/stack";

import { LnUrlStackParamList } from "./index";
import { useStoreState, useStoreActions } from "../../state/store";
import { getDomainFromURL } from "../../utils";
import Blurmodal from "../../components/BlurModal";
import { ILNUrlPayRequestMetadata, PayerIds } from "../../state/LNURL";
import { TouchableOpacity } from "react-native-gesture-handler";
import { Alert } from "../../utils/alert";
import PaymentCard from "./PayRequest/PaymentCard";
import PaymentDone from "./PayRequest/PaymentDone";
import style from "./PayRequest/style";
import { PLATFORM } from "../../utils/constants";

export interface IPayRequestProps {
  navigation: StackNavigationProp<LnUrlStackParamList>;
  route: any;
}
export default function LNURLPayRequest({ navigation, route }: IPayRequestProps) {
  const [preimage, setPreimage] = useState<Uint8Array | undefined>();
  const lnurlStr = useStoreState((store) => store.lnUrl.lnUrlStr);
  const lnUrlObject = useStoreState((store) => store.lnUrl.lnUrlObject);
  const clear = useStoreActions((store) => store.lnUrl.clear);
  const payRequestResponse = useStoreState((store) => store.lnUrl.payRequestResponse);
  const domain = getDomainFromURL(lnurlStr ?? "");
  const syncContact = useStoreActions((actions) => actions.contacts.syncContact);
  const getContactByLightningAddress = useStoreState((actions) => actions.contacts.getContactByLightningAddress);
  const getContactByLnUrlPay = useStoreState((actions) => actions.contacts.getContactByLnUrlPay);

  useEffect(() => {
    return clear
  }, [])

  try {
    if (domain === "" || (!lnUrlObject || lnUrlObject.tag !== "payRequest")) {
      return (<></>);
    }

    const metadata = JSON.parse(lnUrlObject.metadata) as ILNUrlPayRequestMetadata;
    const lightningAddress = metadata?.find((item) => item[0] === "text/identifier" || item[0] === "text/email");

    const paidCallback = (preimage: Uint8Array) => {
      setPreimage(preimage);
    };

    const viewMetadata = () => {
      Alert.alert("Technical metadata", JSON.stringify(metadata, undefined, 2));
    };

    const onPressLightningAddress = () => {
      navigation.navigate("PayRequestAboutLightningAddress");
    }

    const promptLightningAddressContact = () => {
      console.log("prompt promptLightningAddressContact");
      if (!lightningAddress?.[1]) {
        return;
      }

      if (getContactByLightningAddress(lightningAddress[1])) {
        Alert.alert("",`${lightningAddress[1]} is in your contact list!`);
      } else {
        Alert.alert(
          "Add to Contact List",
          `Would you like to add ${lightningAddress[1]} to your contact list?`,
          [{
            text: "No",
            style: "cancel",
          }, {
            text: "Yes",
            style: "default",
            onPress: async () => {
              const domain = lightningAddress[1].split("@")[1] ?? "";

              syncContact({
                type: "PERSON",
                domain,
                lnUrlPay: null,
                lnUrlWithdraw: null,
                lightningAddress: lightningAddress[1],
                lud16IdentifierMimeType: "text/identifier",
                note: "",
              })
            },
          }],
        );
      }
    };

    const promptLnUrlPayContact = () => {
      if (getContactByLnUrlPay(lnurlStr ?? "")) {
        Alert.alert("",`Payment code for ${domain} is in your contact list.`);
      } else {
        Alert.alert(
          "Add to Contact List",
          `Would you like to add this payment code to ${domain} to your contact list?`,
          [{
            text: "No",
          }, {
            text: "Yes",
            onPress: async () => {
              syncContact({
                type: "SERVICE",
                domain,
                lnUrlPay: lnurlStr ?? null,
                lnUrlWithdraw: null,
                lightningAddress: null,
                lud16IdentifierMimeType: null,
                note: "",
              })
            }
          }],
        );
      }
    };

    const disposableIsFalse = /*lnUrlObject.disposable === false ||*/ (preimage && payRequestResponse?.disposable) === false;


    const KeyboardAvoid = PLATFORM === "ios" ? KeyboardAvoidingView : React.Fragment;

    return (
      <Blurmodal useModalComponent={false} goBackByClickingOutside={false}>
        <KeyboardAvoid behavior={"padding"} keyboardVerticalOffset={60}>
          <View style={style.keyboardContainer}>
            {__DEV__ &&
              <View style={{ position: "absolute", top: 50, right: 0, zIndex: 10000 }}>
                <Button small={true} onPress={viewMetadata}>
                  <Text style={{ fontSize: 7.5 }}>View metadata</Text>
                </Button>
              </View>
            }
            <Card style={style.card}>
              <CardItem style={style.cardItem}>
                <Body style={{ flex: 1, height: "100%" }}>
                  <View style={style.headerContainer}>
                    <H1 style={style.header}>
                      {!preimage ? "Pay" : "Paid"}
                    </H1>
                    {lightningAddress?.[1] !== undefined && (
                      <View style={style.contactContainer}>
                        <TouchableOpacity onPress={onPressLightningAddress}><Text style={style.lightningAddress}>{lightningAddress[1]}</Text></TouchableOpacity>
                        <TouchableOpacity onPress={promptLightningAddressContact}>
                          <Icon style={style.contactAddIcon} type="AntDesign" name={getContactByLightningAddress(lightningAddress[1]) !== undefined ? "check" : "adduser"} />
                        </TouchableOpacity>
                      </View>
                    )}
                    {lightningAddress?.[1] === undefined && disposableIsFalse && (
                      <View style={style.contactContainer}>
                        <TouchableOpacity onPress={promptLnUrlPayContact}>
                          <Icon style={style.contactAddIcon} type="AntDesign" name={getContactByLnUrlPay(lnurlStr ?? "") ? "check" : "pluscircle"} />
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                  {!preimage && <PaymentCard onPaid={paidCallback} lnUrlObject={lnUrlObject} />}
                  {preimage && <PaymentDone preimage={preimage} />}
                </Body>
              </CardItem>
            </Card>
          </View>
        </KeyboardAvoid>
      </Blurmodal>
    );
  } catch (error) {
    Alert.alert(`Unable to pay:\n\n${error.message}`);
    navigation.goBack();
    return (<></>);
  }
}

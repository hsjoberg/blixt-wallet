import { CheckBox, Text } from "native-base";
import React from "react";
import { StyleSheet, View } from "react-native";
import { ILNUrlPayRequest, ILNUrlPayRequestPayerData } from "../../../state/LNURL";

import style from "./style";
import Input from "../../../components/Input";

import { useTranslation } from "react-i18next";
import { namespaces } from "../../../i18n/i18n.constants";

export interface IPayerDataProps {
  setComment: (text: string) => void;
  setSendName: (send: boolean) => void;
  setSendIdentifier: (send: boolean) => void;
  sendName: boolean | undefined;
  sendIdentifier: boolean | undefined;
  name: string | null;
  identifier: string | null;
  domain: string;
  commentAllowed: ILNUrlPayRequest["commentAllowed"];
  payerDataName: ILNUrlPayRequestPayerData["name"] | null;
  payerDataIdentifier: ILNUrlPayRequestPayerData["identifier"] | null;
}
export function PayerData({ setComment, setSendName, setSendIdentifier, sendName, sendIdentifier, name, identifier, domain, commentAllowed, payerDataName, payerDataIdentifier}: IPayerDataProps) {
  const t = useTranslation(namespaces.LNURL.payRequest).t;
  return (
    <View style={style.metadataSection}>
      {commentAllowed &&
        <>
          <Text style={style.inputLabel}>
            {t("payerData.commentAllowed", { target: domain, letters: commentAllowed })}
          </Text>
          <View style={{ flexDirection: "row" }}>
            <Input onChangeText={setComment} keyboardType="default" style={[style.input, { marginBottom: 10 }]} />
          </View>
          {(!payerDataName && name) &&
            <View style={{ flexDirection: "row" }}>
              <CheckBox style={style.metadataSectionCheckbox} checked={sendName} onPress={() => setSendName(!sendName)}  />
              <Text style={style.metadataSectionCheckboxLabel} onPress={() => setSendName(!sendName)}>
                {t("payerData.sendNameWithComment")}
              </Text>
            </View>
          }
        </>
      }
      {(payerDataName && name) &&
        <>
          {!payerDataName.mandatory &&
            <View style={styles.payerData}>
              <CheckBox style={style.metadataSectionCheckbox} checked={sendName} onPress={() => setSendName(!sendName)}  />
              <Text style={style.metadataSectionCheckboxLabel} onPress={() => setSendName(!sendName)}>
                {t("payerData.name.ask")}
              </Text>
            </View>
          }
          {payerDataName.mandatory &&
            <View style={styles.payerData}>
              <Text style={style.metadataSectionCheckboxLabel}>
                {t("payerData.name.mandatory")}
              </Text>
            </View>
          }
        </>
      }
      {(payerDataIdentifier && identifier) &&
        <>
          {!payerDataIdentifier.mandatory &&
            <View style={styles.payerData}>
              <CheckBox style={style.metadataSectionCheckbox} checked={sendIdentifier} onPress={() => setSendIdentifier(!sendIdentifier)}  />
              <Text style={style.metadataSectionCheckboxLabel} onPress={() => setSendIdentifier(!sendIdentifier)}>
                {t("payerData.identifier.ask")}
              </Text>
            </View>
          }
          {payerDataIdentifier.mandatory &&
            <View style={styles.payerData}>
              <Text style={style.metadataSectionCheckboxLabel}>
                {t("payerData.identifier.mandatory")}
              </Text>
            </View>
          }
        </>
      }
    </View>
  )
}


const styles = StyleSheet.create({
  payerData: {
    flexDirection: "row",
    marginBottom: 7,
  }
});

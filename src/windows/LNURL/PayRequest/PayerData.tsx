import { CheckBox, Input, Text } from "native-base";
import React from "react";
import { View } from "react-native";
import { ILNUrlPayRequest, ILNUrlPayRequestPayerData } from "../../../state/LNURL";

import style from "./style";

import { useTranslation, TFunction } from "react-i18next";
import { namespaces } from "../../../i18n/i18n.constants";

let t:TFunction;

export interface IPayerDataProps {
  setComment: (text: string) => void;
  setSendName: (send: boolean) => void;
  sendName: boolean | undefined;
  name: string | null;
  domain: string;
  commentAllowed: ILNUrlPayRequest["commentAllowed"];
  payerDataName: ILNUrlPayRequestPayerData["name"] | null;
}
export function PayerData({ setComment, setSendName, sendName, name, domain, commentAllowed, payerDataName}: IPayerDataProps) {
  t = useTranslation(namespaces.LNURL.payRequest.payerData).t;
  return (
    <View style={style.metadataSection}>
      {commentAllowed &&
        <>
          <Text style={style.inputLabel}>
            {t("commentAllowed.msg1")} <Text style={style.boldText}>{domain}</Text> ({t("commentAllowed.msg2")} {commentAllowed} {t("commentAllowed.msg3")}):
          </Text>
          <View style={{ flexDirection: "row" }}>
            <Input onChangeText={setComment} keyboardType="default" style={[style.input, { marginBottom: 10 }]} />
          </View>
          {(!payerDataName && name) &&
            <View style={{ flexDirection: "row" }}>
              <CheckBox style={style.metadataSectionCheckbox} checked={sendName} onPress={() => setSendName(!sendName)}  />
              <Text style={style.metadataSectionCheckboxLabel} onPress={() => setSendName(!sendName)}>
              {t("commentAllowed.msg4")}
              </Text>
            </View>
          }
        </>
      }
      {(payerDataName && name) &&
        <>
          {!payerDataName.mandatory &&
            <View style={{ flexDirection: "row" }}>
              <CheckBox style={style.metadataSectionCheckbox} checked={sendName} onPress={() => setSendName(!sendName)}  />
              <Text style={style.metadataSectionCheckboxLabel} onPress={() => setSendName(!sendName)}>
              {t("payerDataName.msg1")}
              </Text>
            </View>
          }
          {payerDataName.mandatory &&
            <View style={{ flexDirection: "row" }}>
              <Text style={style.metadataSectionCheckboxLabel}>
              {t("payerDataName.msg2")}
              </Text>
            </View>
          }
        </>
      }
    </View>
  )
}

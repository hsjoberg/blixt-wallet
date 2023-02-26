import { CheckBox, Text } from "native-base";
import React from "react";
import { View } from "react-native";
import { ILNUrlPayRequest, ILNUrlPayRequestPayerData } from "../../../state/LNURL";

import style from "./style";
import Input from "../../../components/Input";

import { useTranslation } from "react-i18next";
import { namespaces } from "../../../i18n/i18n.constants";

export interface IPayerDataProps {
  setComment: (text: string) => void;
  setSendName: (send: boolean) => void;
  sendName: boolean | undefined;
  name: string | null;
  domain: string;
  commentAllowed: ILNUrlPayRequest["commentAllowed"];
  payerDataName: ILNUrlPayRequestPayerData["name"] | null;
}
export function PayerData({
  setComment,
  setSendName,
  sendName,
  name,
  domain,
  commentAllowed,
  payerDataName,
}: IPayerDataProps) {
  const t = useTranslation(namespaces.LNURL.payRequest).t;
  return (
    <View style={style.metadataSection}>
      {commentAllowed && (
        <>
          <Text style={style.inputLabel}>
            {t("payerData.commentAllowed", { target: domain, letters: commentAllowed })}
          </Text>
          <View style={{ flexDirection: "row" }}>
            <Input
              onChangeText={setComment}
              keyboardType="default"
              style={[style.input, { marginBottom: 10 }]}
            />
          </View>
          {!payerDataName && name && (
            <View style={{ flexDirection: "row" }}>
              <CheckBox
                style={style.metadataSectionCheckbox}
                checked={sendName}
                onPress={() => setSendName(!sendName)}
              />
              <Text
                style={style.metadataSectionCheckboxLabel}
                onPress={() => setSendName(!sendName)}
              >
                {t("payerData.sendNameWithComment")}
              </Text>
            </View>
          )}
        </>
      )}
      {payerDataName && name && (
        <>
          {!payerDataName.mandatory && (
            <View style={{ flexDirection: "row" }}>
              <CheckBox
                style={style.metadataSectionCheckbox}
                checked={sendName}
                onPress={() => setSendName(!sendName)}
              />
              <Text
                style={style.metadataSectionCheckboxLabel}
                onPress={() => setSendName(!sendName)}
              >
                {t("payerData.name.ask")}
              </Text>
            </View>
          )}
          {payerDataName.mandatory && (
            <View style={{ flexDirection: "row" }}>
              <Text style={style.metadataSectionCheckboxLabel}>
                {t("payerData.name.mandatory")}
              </Text>
            </View>
          )}
        </>
      )}
    </View>
  );
}

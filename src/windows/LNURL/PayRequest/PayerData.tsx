import { CheckBox, Input, Text } from "native-base";
import React from "react";
import { View } from "react-native";
import { ILNUrlPayRequest, ILNUrlPayRequestPayerData } from "../../../state/LNURL";

import style from "./style";

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
  return (
    <View style={style.metadataSection}>
      {commentAllowed &&
        <>
          <Text style={style.inputLabel}>
            Comment to <Text style={style.boldText}>{domain}</Text> (max {commentAllowed} letters):
          </Text>
          <View style={{ flexDirection: "row" }}>
            <Input onChangeText={setComment} keyboardType="default" style={[style.input, { marginBottom: 10 }]} />
          </View>
          {(!payerDataName && name) &&
            <View style={{ flexDirection: "row" }}>
              <CheckBox style={style.metadataSectionCheckbox} checked={sendName} onPress={() => setSendName(!sendName)}  />
              <Text style={style.metadataSectionCheckboxLabel} onPress={() => setSendName(!sendName)}>
                Send my name together with this comment
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
                Send my name together with this payment
              </Text>
            </View>
          }
          {payerDataName.mandatory &&
            <View style={{ flexDirection: "row" }}>
              <Text style={style.metadataSectionCheckboxLabel}>
                Your name has to be sent together with this payment
              </Text>
            </View>
          }
        </>
      }
    </View>
  )
}

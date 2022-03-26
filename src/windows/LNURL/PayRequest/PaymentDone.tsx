import React from "react";
import { Linking } from "react-native";
import Clipboard from "@react-native-community/clipboard"
import { Text, View, Button } from "native-base";
import { useNavigation } from "@react-navigation/native";

import { useStoreState, useStoreActions } from "../../../state/store";
import { toast, getDomainFromURL, decryptLNURLPayAesTagMessage } from "../../../utils";
import TextLink from "../../../components/TextLink";
import { Done } from "../../Send/SendDone";
import style from "./style";

import { useTranslation } from "react-i18next";
import { namespaces } from "../../../i18n/i18n.constants";

export interface IPayRequestDoneProps {
  preimage: Uint8Array;
  callback?: (r: Uint8Array | null) => void;
}
export default function LNURLPayRequestDone({ preimage, callback }: IPayRequestDoneProps) {
  const t = useTranslation(namespaces.LNURL.payRequest.paymentDone).t;
  const navigation = useNavigation();
  const clear = useStoreActions((store) => store.lnUrl.clear);
  const lnurlStr = useStoreState((store) => store.lnUrl.lnUrlStr);
  const payRequestResponse = useStoreState((store => store.lnUrl.payRequestResponse));
  const domain = getDomainFromURL(lnurlStr!);

  if (!payRequestResponse) {
    return (<></>);
  }

  const done = () => {
    clear();
    callback?.(preimage);
    navigation.goBack();
  };

  const onPressCopyUrltoClipboard = () => {
    if (payRequestResponse.successAction?.tag === "url") {
      Clipboard.setString(payRequestResponse.successAction.url);
      toast(t("url.copy.msg"), undefined, "warning")
    }
  };

  const onPressOpenUrlInBrowser = async () => {
    if (payRequestResponse.successAction?.tag === "url") {
      await Linking.openURL(payRequestResponse.successAction.url);
    }
  };

  return (
    <>
      {/* <View style={style.contentContainer}> */}
        {payRequestResponse.successAction?.tag === "message" &&
          <>
            <Text>
              {t("message.title")} {domain}:{"\n"}
              {payRequestResponse.successAction.message}
            </Text>
          </>
        }
        {payRequestResponse.successAction?.tag === "url" &&
          <>
            <Text style={style.text}>
              {t("url.description")}:{"\n"}
              {payRequestResponse.successAction.description}
            </Text>
            <Text style={style.text}>
              {t("url.domain")} {domain}:{"\n"}
              <TextLink url={payRequestResponse.successAction.url}>
                {payRequestResponse.successAction.url}
              </TextLink>
            </Text>
          </>
        }
        {payRequestResponse.successAction?.tag === "aes" &&
          <>
            <Text style={style.text}>{t("aes.domain")}{domain}.</Text>
            <Text style={style.text}>
              {t("aes.description")} {domain}:{"\n"}
              {payRequestResponse.successAction.description}
            </Text>
            <Text style={style.text}>
            {t("aes.secret")}:{"\n"}
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
        {/* {!payRequestResponse.successAction && ( */}
          <View style={{ width: "100%", flexGrow: 1, justifyContent: "center", alignItems: "center" }}>
            <Done />
          </View>
        {/* )} */}
      {/* </View> */}
      <View style={[style.actionBar, { }]}>
        <Button onPress={done} small={true}>
          <Text style={{ fontSize:10 }}>{t("url.done.title")}</Text>
        </Button>
        {payRequestResponse.successAction?.tag === "url" &&
          <>
            <Button
              onPress={onPressCopyUrltoClipboard}
              small
              style={{ marginRight: 12 }}
            >
              <Text style={{ fontSize:10 }}>{t("url.copy.title")}</Text>
            </Button>
            <Button
              onPress={onPressOpenUrlInBrowser}
              small
              style={{ marginRight: 12 }}
            >
              <Text style={{ fontSize:10 }}>{t("url.open.title")}</Text>
            </Button>
          </>
        }
      </View>
    </>
  );
}

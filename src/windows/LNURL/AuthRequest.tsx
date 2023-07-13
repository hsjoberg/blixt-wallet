import React, { useEffect, useState } from "react";
import { Vibration, Alert } from "react-native";
import { StackNavigationProp } from "@react-navigation/stack";

import { useStoreState, useStoreActions } from "../../state/store";
import { getDomainFromURL, timeout, toast } from "../../utils";

import { useTranslation } from "react-i18next";
import { namespaces } from "../../i18n/i18n.constants";


interface IAuthRequestProps {
  navigation: StackNavigationProp<{}>;
}
export default function LNURLChannelRequest({ navigation }: IAuthRequestProps) {
  const t = useTranslation(namespaces.LNURL.authRequest).t;
  const [done, setDone] = useState(false);
  const lnurlStr = useStoreState((store) => store.lnUrl.lnUrlStr);
  const type = useStoreState((store) => store.lnUrl.type);
  const doAuthRequest = useStoreActions((store) => store.lnUrl.doAuthRequest);
  const clear = useStoreActions((store) => store.lnUrl.clear);

  useEffect(() => {
    if (done) {
      return;
    }
    // tslint:disable-next-line
    (async () => {
      if (type === "login") {
        await timeout(100);

        const domain = getDomainFromURL(lnurlStr!);
        Alert.alert(
          t("layout.title"),
          `${t("layout.msg")} ${domain}?`,
          [
            {
              text: t("buttons.yes",{ns:namespaces.common}),
              onPress: async () => {
                try {
                  const result = await doAuthRequest();
                  setDone(true);
                  clear();
                  Vibration.vibrate(32);
                  toast(
                    `${t("layout.success")} ${domain}`,
                    10000,
                    "success",
                    "Okay"
                  );
                  navigation.pop();
                } catch (e) {
                  console.log(e);
                  setDone(true);
                  clear();
                  Vibration.vibrate(50);
                  toast(
                    `${t("msg.error", { ns:namespaces.common })}: `  + e.message,
                    12000,
                    "warning",
                    "Okay"
                  );
                  navigation.pop();
                }
              }
            }, {
              text: t("buttons.no",{ns:namespaces.common}),
              onPress: () => {
                clear();
                navigation.pop();
              },
              style: 'cancel'
            },
          ]
        );
      }
    })();
  }, []);

  return (<></>);
}

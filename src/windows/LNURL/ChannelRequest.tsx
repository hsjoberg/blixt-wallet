import React, { useEffect, useState } from "react";
import { StatusBar, Vibration } from "react-native";
import { Spinner } from "native-base";
import { StackNavigationProp } from "@react-navigation/stack";

import Container from "../../components/Container";
import { blixtTheme } from "../../native-base-theme/variables/commonColor";
import { useStoreState, useStoreActions } from "../../state/store";
import { toast, timeout } from "../../utils";

import { useTranslation } from "react-i18next";
import { namespaces } from "../../i18n/i18n.constants";

interface IChannelRequestProps {
  navigation: StackNavigationProp<{}>;
}
export default function LNURLChannelRequest({ navigation }: IChannelRequestProps) {
  const t = useTranslation(namespaces.LNURL.channelRequest).t;
  const [done, setDone] = useState(false);
  const type = useStoreState((store) => store.lnUrl.type);
  const doChannelRequest = useStoreActions((store) => store.lnUrl.doChannelRequest);
  const clear = useStoreActions((store) => store.lnUrl.clear);

  useEffect(() => {
    if (done) {
      return;
    }
    // tslint:disable-next-line
    (async () => {
      console.log("Doing LNURL channelRequest");
      // react-navigation bugs out if the processing goes too fast
      await timeout(500);
      if (type === "channelRequest") {
        try {
          const result = await doChannelRequest({
            private: true,
          });
          setDone(true);
          clear();
          Vibration.vibrate(32);
          toast(
            t("alert"),
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
            `${t("msg.error",{ns:namespaces.common})}: ` + e.message,
            12000,
            "warning",
            "Okay"
          );
          navigation.pop();
        }
      }
    })();
  }, []);

  return (
    <Container centered style={{ backgroundColor: blixtTheme.dark }}>
      <StatusBar
        backgroundColor="transparent"
        hidden={false}
        translucent={true}
        networkActivityIndicatorVisible={true}
        barStyle="light-content"
      />
      <Spinner color={blixtTheme.light} size={55} />
    </Container>
  );
}

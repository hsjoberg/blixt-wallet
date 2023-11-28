import React, { useEffect, useLayoutEffect, useRef } from "react";
import { EmitterSubscription, NativeModules } from "react-native";
import { StackNavigationProp } from "@react-navigation/stack";
import { Icon } from "native-base";
import Clipboard from "@react-native-clipboard/clipboard";

import { SettingsStackParamList } from "./index";
import Container from "../../components/Container";
import { NavigationButton } from "../../components/NavigationButton";
import { LndMobileToolsEventEmitter } from "../../utils/event-listener";
import { toast } from "../../utils";
import LogBox from "../../components/LogBox";
import useForceUpdate from "../../hooks/useForceUpdate";

import { useTranslation } from "react-i18next";
import { namespaces } from "../../i18n/i18n.constants";

export interface ILndLogProps {
  navigation: StackNavigationProp<SettingsStackParamList, "LndLog">;
}
export default function LndLog({ navigation }: ILndLogProps) {
  const t = useTranslation(namespaces.settings.lndLog).t;

  let log = useRef("");
  const forceUpdate = useForceUpdate();

  useEffect(() => {
    let listener: EmitterSubscription;
    (async () => {
      const tailLog = await NativeModules.LndMobileTools.tailLog(100);
      log.current = tailLog
        .split("\n")
        .map((row) => row.slice(11))
        .join("\n");

      listener = LndMobileToolsEventEmitter.addListener("lndlog", function (data: string) {
        log.current = log.current + "\n" + data.slice(11);
        forceUpdate();
      });

      NativeModules.LndMobileTools.observeLndLogFile();
      forceUpdate();
    })();

    return () => {
      listener.remove();
    };
  }, []);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerTitle: "Lnd log",
      headerShown: true,
      headerRight: () => {
        return (
          <NavigationButton onPress={() => onPressCopy(log.current)}>
            <Icon type="MaterialCommunityIcons" name="content-copy" style={{ fontSize: 22 }} />
          </NavigationButton>
        );
      },
    });
  }, [navigation]);

  const onPressCopy = (l: string) => {
    Clipboard.setString(l);
    toast(t("msg.clipboardCopy", { ns: namespaces.common }));
  };

  return (
    <Container>
      <LogBox text={log.current} scrollLock={true} />
    </Container>
  );
}

import React, { useEffect, useLayoutEffect, useRef } from "react";
import { StackNavigationProp } from "@react-navigation/stack";
import { Icon } from "native-base";
import Clipboard from "@react-native-clipboard/clipboard";

import { SettingsStackParamList } from "./index";
import Container from "../../components/Container";
import { NavigationButton } from "../../components/NavigationButton";
import { toast } from "../../utils";
import LogBox from "../../components/LogBox";
import useForceUpdate from "../../hooks/useForceUpdate";

import { useTranslation } from "react-i18next";
import { namespaces } from "../../i18n/i18n.constants";
import NativeBlixtTools from "../../turbomodules/NativeBlixtTools";

export interface ILndLogProps {
  navigation: StackNavigationProp<SettingsStackParamList, "SpeedloaderLog">;
}
export default function LndLog({ navigation }: ILndLogProps) {
  const t = useTranslation(namespaces.settings.lndLog).t;

  let log = useRef("");
  const forceUpdate = useForceUpdate();

  useEffect(() => {
    (async () => {
      try {
        const tailLog = await NativeBlixtTools.tailSpeedloaderLog(300);
        log.current = tailLog;
        forceUpdate();
      } catch (error: any) {
        toast(error.message, 0, "danger", "OK");
      }
    })();

    return () => {};
  }, []);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerTitle: "Speedloader log",
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

  console.log(log.current);
  return (
    <Container>
      <LogBox text={log.current} scrollLock={true} />
    </Container>
  );
}

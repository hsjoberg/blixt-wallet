import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
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
  const [logs, setLogs] = useState("");

  let log = useRef("");
  const forceUpdate = useForceUpdate();

  const fetchLogs = async () => {
    try {
      const tailLog = await NativeModules.LndMobileTools.tailLog(100);
      setLogs(tailLog);
    } catch (error) {
      console.error("Error fetching logs:", error);
    }
  };

  useEffect(() => {
    fetchLogs();
    const logUpdateTimer = setInterval(fetchLogs, 1000);
    return () => clearInterval(logUpdateTimer);
  }, []);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerTitle: "Lnd log",
      headerShown: true,
      headerRight: () => {
        return (
          <NavigationButton onPress={() => onPressCopy(logs)}>
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
      <LogBox text={logs} scrollLock={true} />
    </Container>
  );
}

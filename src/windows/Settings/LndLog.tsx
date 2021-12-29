import React, { useEffect, useLayoutEffect, useRef } from "react";
import { EmitterSubscription, NativeModules } from "react-native";
import { StackNavigationProp } from "@react-navigation/stack";
import { Icon, Text } from "native-base";
import Clipboard from "@react-native-community/clipboard";

import { SettingsStackParamList } from "./index";
import Container from "../../components/Container";
import { NavigationButton } from "../../components/NavigationButton";
import { LndMobileToolsEventEmitter } from "../../utils/event-listener";
import { toast } from "../../utils";
import LogBox from "../../components/LogBox";
import useForceUpdate from "../../hooks/useForceUpdate";

export interface ILndLogProps {
  navigation: StackNavigationProp<SettingsStackParamList, "LndLog">;
}
export default function LndLog({ navigation }: ILndLogProps) {
  let log = useRef("");
  const forceUpdate = useForceUpdate();

  useEffect(() => {
    let listener: EmitterSubscription;
    (async () => {
      const tailLog = await NativeModules.LndMobileTools.tailLog(100);
      log.current = tailLog.split("\n").map((row) => row.slice(11)).join("\n");

      listener = LndMobileToolsEventEmitter.addListener("lndlog", function (data: string) {
        log.current = log.current + "\n" + data.slice(11);
        forceUpdate();
      });

      NativeModules.LndMobileTools.observeLndLogFile();
      forceUpdate();
    })();

    return () => {
      listener.remove();
    }
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
        )
      }
    });
  }, [navigation]);

  const onPressCopy = (l: string) => {
    Clipboard.setString(l);
    toast("Copied to clipboard");
  }

  return (
    <Container>
      <LogBox text={log.current} scrollLock={true} />
    </Container>
  )
}

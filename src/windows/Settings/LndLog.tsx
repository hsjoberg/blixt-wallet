import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { EmitterSubscription, NativeModules, NativeScrollEvent, NativeSyntheticEvent, ScrollView } from "react-native";
import { StackNavigationProp } from "@react-navigation/stack";
import { Icon, Text } from "native-base";
import Clipboard from "@react-native-community/clipboard";

import { SettingsStackParamList } from "./index";
import Container from "../../components/Container";
import { NavigationButton } from "../../components/NavigationButton";
import { LndMobileToolsEventEmitter } from "../../utils/event-listener";
import { toast } from "../../utils";

export interface ILndLogProps {
  navigation: StackNavigationProp<SettingsStackParamList, "LndLog">;
}
export default function LndLog({ navigation }: ILndLogProps) {
  let log = useRef("");
  const [render, setRender] = useState(0);
  const logScrollView = useRef<ScrollView>(null);
  const [scrollViewAtTheEnd, setScrollViewAtTheEnd] = useState(true);

  useEffect(() => {
    let listener: EmitterSubscription;
    (async () => {
      const tailLog = await NativeModules.LndMobileTools.tailLog(100);
      log.current = tailLog.split("\n").map((row) => row.slice(11)).join("\n");

      listener = LndMobileToolsEventEmitter.addListener("lndlog", function (data: string) {
        log.current = log.current + "\n" + data.slice(11);
        setRender((r) => r + 1);
      });

      NativeModules.LndMobileTools.observeLndLogFile();

      setRender(render + 1);
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

  const isCloseToBottom = ({layoutMeasurement, contentOffset, contentSize}: NativeScrollEvent) => {
    const paddingToBottom = 20;
    return layoutMeasurement.height + contentOffset.y >= contentSize.height - paddingToBottom;
  };

  return (
    <Container>
      <ScrollView
        ref={logScrollView}
        contentContainerStyle={{ padding: 8 }}
        onContentSizeChange={() => {
          if (scrollViewAtTheEnd) {
            logScrollView.current?.scrollToEnd();
          }
        }}
        onScroll={({nativeEvent}) => {
          setScrollViewAtTheEnd(isCloseToBottom(nativeEvent));
        }}
        scrollEventThrottle={400}
      >
        <Text style={{ fontSize: 10 }}>{log.current}</Text>
      </ScrollView>
    </Container>
  )
}

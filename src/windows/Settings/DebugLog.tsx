import React, { useLayoutEffect } from "react";
import { FlatList, StyleSheet } from "react-native";
import { Body, Card, CardItem, Icon, Row, Text } from "native-base";
import { StackNavigationProp } from "@react-navigation/stack";
import { RouteProp } from "@react-navigation/native";
import Clipboard from "@react-native-community/clipboard";

import Container from "../../components/Container";
import { NavigationButton } from "../../components/NavigationButton";
import { SettingsStackParamList } from "./index";
import { toast, useGetToastEntries } from "../../utils";
import { fontFactorNormalized } from "../../utils/scale";

import { useTranslation } from "react-i18next";
import { namespaces } from "../../i18n/i18n.constants";
import { LogLevel, useGetLogEntries } from "../../utils/log";
import { Debug } from "../../utils/build";
import { blixtTheme } from "../../native-base-theme/variables/commonColor";
import { PLATFORM } from "../../utils/constants";


export interface ISelectListProps {
  navigation: StackNavigationProp<SettingsStackParamList, "DebugLog">;
  route: RouteProp<SettingsStackParamList, "DebugLog">;
}

export default function({ navigation }: ISelectListProps) {
  const t = useTranslation(namespaces.settings.debugLog).t;
  const logEntries = useGetLogEntries();

  useLayoutEffect(() => {
    navigation.setOptions({
      headerTitle: t("title"),
      headerShown: true,
      headerRight: () => {
        return (
          <NavigationButton onPress={onPressCopyAllToasts}>
            <Icon type="MaterialCommunityIcons" name="content-copy" style={{ fontSize: 22 }} />
          </NavigationButton>
        )
      }
    });
  }, [navigation]);

  const onCopyToastMessage = (i: number) => {
    console.log(logEntries[i]);
    Clipboard.setString(`[${logEntries[i][0]}] ${logEntries[i][1]}`);
    toast("Copied to clipboard");
  }

  const onPressCopyAllToasts = () => {
    Clipboard.setString(logEntries.reduce((prev, current, i) => {
      return `${prev}\n${("["+logEntries[i][0]+"]").padEnd(8)} ${logEntries[i][1]}`
    }, ""));
    toast("Copied to clipboard");
  }

  return (
    <Container>
      <FlatList
        contentContainerStyle={{ padding: 14 }}
        initialNumToRender={20}
        data={logEntries}
        renderItem={({ item: toast, index }) => (
          <Card style={style.card} key={index}>
            <CardItem>
              <Body>
                <Row style={{ width: "100%" }}>
                  <Text style={{
                    marginRight: 28,
                    fontFamily: PLATFORM !=="macos" ? "monospace" : undefined,
                    fontSize: 11
                  }}>
                    <Text style={{
                      fontFamily: PLATFORM !=="macos" ? "monospace" : undefined,
                      fontSize: 9,
                      color: fixLogLevelColor(toast[0])
                    }}>{toast[0]+"\n"}</Text>
                    {toast[1]}
                    </Text>
                  <Text style={{ position:"absolute", right: 0 }}>
                    <Icon type="MaterialCommunityIcons" name="content-copy" style={style.icon} onPress={() => onCopyToastMessage(index)} />
                  </Text>
                </Row>
              </Body>
            </CardItem>
          </Card>
        )}
        keyExtractor={(toast, i) => toast[1] + i}
      />
    </Container>
  )
}

const style = StyleSheet.create({
  card: {
    width: "100%",
    marginTop: 8,
  },
  icon: {
    fontSize: 18 * fontFactorNormalized,
  },
});

function fixLogLevelColor(level: LogLevel) {
  if (level === "Verbose") {
    return blixtTheme.lightGray;
  } else if (level === "Debug") {
    return blixtTheme.lightGray;
  } else if (level === "Info") {
    return "#fff";
  } else if (level === "Warning") {
    return blixtTheme.secondary;
  } else if (level === "Error") {
    return blixtTheme.red;
  }
}

import React, { useLayoutEffect } from "react";
import { FlatList, StyleSheet } from "react-native";
import { Body, Card, CardItem, Icon, Row, Text } from "native-base";
import { StackNavigationProp } from "@react-navigation/stack";
import { RouteProp } from "@react-navigation/native";
import Clipboard from "@react-native-clipboard/clipboard";

import Container from "../../components/Container";
import { NavigationButton } from "../../components/NavigationButton";
import { SettingsStackParamList } from "./index";
import { toast, useGetToastEntries } from "../../utils";
import { fontFactorNormalized } from "../../utils/scale";

import { useTranslation } from "react-i18next";
import { namespaces } from "../../i18n/i18n.constants";

export interface ISelectListProps {
  navigation: StackNavigationProp<SettingsStackParamList, "ToastLog">;
  route: RouteProp<SettingsStackParamList, "ToastLog">;
}

export default function ({ navigation }: ISelectListProps) {
  const t = useTranslation(namespaces.settings.toastLog).t;
  const toastEntries = useGetToastEntries();

  useLayoutEffect(() => {
    navigation.setOptions({
      headerTitle: t("title"),
      headerShown: true,
      headerRight: () => {
        return (
          <NavigationButton onPress={onPressCopyAllToasts}>
            <Icon type="MaterialCommunityIcons" name="content-copy" style={{ fontSize: 22 }} />
          </NavigationButton>
        );
      },
    });
  }, [navigation]);

  const onCopyToastMessage = (i: number) => {
    console.log(toastEntries);
    Clipboard.setString(toastEntries[i] ?? "");
    toast("Copied to clipboard");
  };

  const onPressCopyAllToasts = () => {
    Clipboard.setString(toastEntries.join("\n") ?? "");
    toast("Copied to clipboard");
  };

  return (
    <Container>
      <FlatList
        contentContainerStyle={{ padding: 14 }}
        initialNumToRender={20}
        data={toastEntries}
        renderItem={({ item: toast, index }) => (
          <Card style={style.card} key={index}>
            <CardItem>
              <Body>
                <Row style={{ width: "100%" }}>
                  <Text style={{ marginRight: 28 }}>{toast}</Text>
                  <Text style={{ position: "absolute", right: 0 }}>
                    <Icon
                      type="MaterialCommunityIcons"
                      name="content-copy"
                      style={style.icon}
                      onPress={() => onCopyToastMessage(index)}
                    />
                  </Text>
                </Row>
              </Body>
            </CardItem>
          </Card>
        )}
        keyExtractor={(toast, i) => toast + i}
      />
    </Container>
  );
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

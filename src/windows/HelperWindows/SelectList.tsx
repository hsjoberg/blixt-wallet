import React, { useLayoutEffect, useState } from "react";
import { Header, Icon, Item, ListItem, Text } from "native-base";
import Container from "../../components/Container";
import { FlatList, StyleSheet } from "react-native";
import { blixtTheme } from "../../native-base-theme/variables/commonColor";
import { StackNavigationProp } from "@react-navigation/stack";
import { RouteProp } from "@react-navigation/native";
import Input from "../../components/Input";

import { useTranslation } from "react-i18next";
import { namespaces } from "../../i18n/i18n.constants";

export interface ISelectListNavigationProps<T> {
  title: string;
  onPick: (address: T) => void;
  data: { title: string; value: T }[];
  searchEnabled?: boolean;
  description?: string;
}

type IFakeStack<T> = {
  SelectList: ISelectListNavigationProps<T>;
};

export interface ISelectListProps<T> {
  navigation: StackNavigationProp<IFakeStack<T>, "SelectList">;
  route: RouteProp<IFakeStack<T>, "SelectList">;
}

export default function <T = string>({ navigation, route }: ISelectListProps<T>) {
  const t = useTranslation(namespaces.common).t;
  const title = route?.params?.title ?? "";
  const onPick = route?.params?.onPick ?? (() => {});
  const data = route?.params?.data ?? [];
  const searchEnabled = route?.params?.searchEnabled ?? false;
  const description = route?.params?.description;

  useLayoutEffect(() => {
    navigation.setOptions({
      headerTitle: title,
      headerShown: true,
    });
  }, [navigation]);

  const [searchText, setSearchText] = useState(""); // No debouncer necessary

  return (
    <Container>
      {/* TODO(hsjoberg): Replace with react-navigation search bar when possible */}
      {/* https://github.com/react-navigation/search-layout/pull/20 */}
      {searchEnabled && (
        <Header iosBarStyle="light-content" searchBar rounded style={style.searchHeader}>
          <Item rounded style={{ height: 35 }}>
            <Input
              style={{ marginLeft: 8, marginTop: -2.5, borderRadius: 8, color: blixtTheme.dark }}
              placeholder={t("generic.search")}
              onChangeText={(text) => setSearchText(text)}
              autoCorrect={false}
            />
            <Icon name="ios-search" />
          </Item>
        </Header>
      )}
      <FlatList
        alwaysBounceVertical={false}
        ListHeaderComponent={
          description ? <Text style={style.description}>{description}</Text> : undefined
        }
        contentContainerStyle={{ paddingTop: 8, paddingHorizontal: 14, paddingBottom: 65 }}
        initialNumToRender={20}
        data={data.filter(({ title, value }) => {
          return (
            title.toUpperCase().includes(searchText.toUpperCase()) ||
            (typeof value === "string" && value.toUpperCase().includes(searchText.toUpperCase()))
          );
        })}
        renderItem={({ item }) => (
          <ListItem
            style={{}}
            key={item.value}
            onPress={() => {
              onPick(item.value);
              navigation.pop();
            }}
          >
            <Text>{item.title}</Text>
          </ListItem>
        )}
        keyExtractor={(item) => item.value}
      />
    </Container>
  );
}

const style = StyleSheet.create({
  description: {
    marginTop: 35,
    marginHorizontal: 10,
    marginBottom: 35,
  },
  searchHeader: {
    backgroundColor: blixtTheme.primary,
    paddingTop: 0,
    borderBottomWidth: 0,
    marginHorizontal: 8,
    elevation: 0,
  },
});

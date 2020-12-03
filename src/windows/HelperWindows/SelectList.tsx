import React, { useLayoutEffect, useState } from "react";
import { Header, Icon, Input, Item, ListItem, Text } from "native-base";
import Container from "../../components/Container";
import { FlatList, View } from "react-native";
import { blixtTheme } from "../../../native-base-theme/variables/commonColor";
import { StackNavigationProp } from "@react-navigation/stack";
import { RouteProp } from "@react-navigation/native";

type onPickCallback = (address: string) => void;

export interface ISelectListNavigationProps<T> {
  title: string;
  onPick: (address: T) => void;
  data: { title: string, value: T }[];
  searchEnabled?: boolean;
}

type IFakeStack<T> = {
  SelectList: ISelectListNavigationProps<T>;
}

export interface ISelectListProps<T> {
  navigation: StackNavigationProp<IFakeStack<T>, "SelectList">;
  route: RouteProp<IFakeStack<T>, "SelectList">;
}

export default function<T = string>({ navigation, route }: ISelectListProps<string>) {
  const title = route?.params?.title ?? "";
  const onPick = route?.params?.onPick ?? (() => {});
  const data = route?.params?.data ?? [];
  const searchEnabled = route?.params?.searchEnabled ?? false;

  useLayoutEffect(() => {
    navigation.setOptions({
      headerTitle: title,
      headerShown: true,
    });
  }, [navigation]);

  const [searchText, setSearchText] = useState(""); // No debouncer necessary

  return (
    <Container>
      {/* Replace with react-navigation search bar when possible */}
      {/* https://github.com/react-navigation/search-layout/pull/20 */}
      {searchEnabled &&
        <Header iosBarStyle="light-content" searchBar rounded style={{
          backgroundColor: blixtTheme.primary,
          paddingTop: 0,
          borderBottomWidth: 0,
          marginHorizontal: 8,
        }}>
          <Item rounded style={{ height:35 }}>
            <Input
              style={{ marginLeft: 8, marginTop: -2.5, borderRadius: 8, color: blixtTheme.dark }}
              placeholder="Search"
              onChangeText={(text) => setSearchText(text)}
              autoCorrect={false}
            />
            <Icon name="ios-search" />
          </Item>
        </Header>
      }
      <View>
        <FlatList
          contentContainerStyle={{ paddingTop: 8, paddingHorizontal: 14, paddingBottom: 100 }}
          initialNumToRender={20}
          data={data.filter(({ title, value }) => {
            return (
              title.toUpperCase().includes(searchText.toUpperCase()) ||
              value.toUpperCase().includes(searchText.toUpperCase())
            );
          })}
          renderItem={({ item }) => (
            <ListItem style={{}} key={item.value} onPress={() => {
              onPick(item.value);
              navigation.pop();
            }}>
              <Text>{item.title}</Text>
            </ListItem>
          )}
          keyExtractor={(item) => item.value}
        />
      </View>
    </Container>
  )
}
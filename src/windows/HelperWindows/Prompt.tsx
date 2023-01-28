import React, { useLayoutEffect, useState } from "react";
import { Button, Card, CardItem, Header, Icon, Item, ListItem, Text } from "native-base";
import Container from "../../components/Container";
import { AlertButton, FlatList, StyleSheet, View } from "react-native";
import { blixtTheme } from "../../native-base-theme/variables/commonColor";
import { StackNavigationProp } from "@react-navigation/stack";
import { RouteProp } from "@react-navigation/native";
import Input from "../../components/Input";
import BlurModal from "../../components/BlurModal";
import style2 from "../LNURL/PayRequest/style";

export interface IPromptNavigationProps {
  title: string;
  message?: string;
  defaultValue?: string;
  callbackOrButtons?: ((text: string) => void) | AlertButton[];
  onOk: (input: string) => void;
  onCancel: () => void;
}

type IFakeStack = {
  Prompt: IPromptNavigationProps;
}

export interface ISelectListProps {
  navigation: StackNavigationProp<IFakeStack, "Prompt">;
  route: RouteProp<IFakeStack, "Prompt">;
}

export default function({ navigation, route }: ISelectListProps) {
  const { title, message, onOk, onCancel, defaultValue } = route.params;
  const [inputText, setInputText] = useState(defaultValue ?? "");

  function onPressOk() {
    onOk(inputText);
    navigation.pop();
  }

  function onPressCancel() {
    onCancel();
    navigation.pop();
  }

  return (
    <BlurModal goBackByClickingOutside={false}>
      <Card>
        <CardItem>
          <View style={style.container}>
            <Text style={style.title}>{title}</Text>
            <Text style={style.message}>{message}</Text>
            <View style={style.inputContainer}>
              <Input
                style={style2.input}
                value={inputText}
                onChangeText={setInputText}
                onKeyPress={(event) => {
                  if (["Enter", "\u2028"].includes(event.nativeEvent.key)) {
                    onPressOk();
                  }
                }}
                autoFocus
              />
            </View>
            <View style={style.buttons}>
              <Button
                small
                success
                style={style.button}
                onPress={onPressOk}
              >
                <Text>Okay</Text>
              </Button>
              <Button
                small
                style={style.button}
                onPress={onPressCancel}
              >
                <Text>Cancel</Text>
              </Button>
            </View>
          </View>
        </CardItem>
      </Card>
    </BlurModal>
  )
}

const style = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: "column",
  },
  title: {
    fontFamily: blixtTheme.fontMedium,
    fontSize: 21,
    marginBottom: 13,
  },
  message: {
    marginBottom: 20,
  },
  inputContainer: {
    flexDirection: "row",
    marginBottom: 20,
  },
  buttons: {
    flexDirection: "row-reverse",
  },
  button: {
    marginLeft: 10,
  },
  buttonOk: {
  },
  buttonCancel: {

  },
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
  }
});

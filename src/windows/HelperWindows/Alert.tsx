import React from "react";
import { Card, CardItem, Text } from "native-base";
import { AlertButton, StyleSheet, View } from "react-native";
import { StackNavigationProp } from "@react-navigation/stack";
import { RouteProp } from "@react-navigation/native";

import { Button } from "../../components/Button";
import BlurModal from "../../components/BlurModal";
import { blixtTheme } from "../../native-base-theme/variables/commonColor";

export interface IHelperAlertNavigationProps {
  title: string;
  message?: string;
  buttons?: AlertButton[];
}

type IFakeStack = {
  HelperAlert: IHelperAlertNavigationProps;
};

export interface IHelperAlertProps {
  navigation: StackNavigationProp<IFakeStack, "HelperAlert">;
  route: RouteProp<IFakeStack, "HelperAlert">;
}

export default function HelperAlert({ navigation, route }: IHelperAlertProps) {
  const { title, message } = route.params;
  const buttons = route.params.buttons?.length ? route.params.buttons : [{ text: "OK" }];

  function onPressButton(button: AlertButton) {
    navigation.pop();
    button.onPress?.();
  }

  return (
    <BlurModal goBackByClickingOutside={false} style={style.modal}>
      <Card>
        <CardItem>
          <View style={style.container}>
            <Text style={style.title}>{title}</Text>
            {message ? <Text style={style.message}>{message}</Text> : undefined}
            <View style={style.buttons}>
              {buttons.map((button, index) => {
                // const isCancel = button.style === "cancel";
                const isDestructive = button.style === "destructive";

                return (
                  <View
                    key={`${button.text ?? "button"}-${index}`}
                    style={index > 0 ? style.buttonSpacing : undefined}
                  >
                    <Button
                      small
                      // success={!isCancel && !isDestructive}
                      danger={isDestructive}
                      style={style.button}
                      onPress={() => onPressButton(button)}
                    >
                      <Text style={style.buttonText}>{button.text ?? "OK"}</Text>
                    </Button>
                  </View>
                );
              })}
            </View>
          </View>
        </CardItem>
      </Card>
    </BlurModal>
  );
}

const style = StyleSheet.create({
  modal: {
    maxWidth: 350,
  },
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
  buttons: {
    alignItems: "stretch",
  },
  button: {
    alignSelf: "stretch",
    justifyContent: "center",
  },
  buttonSpacing: {
    marginTop: 10,
  },
  buttonText: {
    textAlign: "center",
  },
});

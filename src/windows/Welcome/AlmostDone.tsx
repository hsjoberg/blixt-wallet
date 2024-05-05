import React from "react";
import { StatusBar, StyleSheet, ToastAndroid } from "react-native";
import {
  Body,
  Icon,
  Text,
  View,
  Button,
  H1,
  List,
  Left,
  ListItem,
  Right,
  CheckBox,
} from "native-base";
import DialogAndroid from "react-native-dialogs";
import {
  createStackNavigator,
  StackNavigationOptions,
  StackNavigationProp,
} from "@react-navigation/stack";

import { useStoreState, useStoreActions } from "../../state/store";
import style from "./style";
import { LoginMethods } from "../../state/Security";
import Container from "../../components/Container";
import SetPincode from "../Settings/SetPincode";
import RemovePincodeAuth from "../Settings/RemovePincodeAuth";
import ChangeFingerprintSettingsAuth from "../Settings/ChangeFingerprintSettingsAuth";
import SelectList, { ISelectListNavigationProps } from "../HelperWindows/SelectList";
import { PLATFORM } from "../../utils/constants";
import { IFiatRates } from "../../state/Fiat";
import useStackNavigationOptions from "../../hooks/useStackNavigationOptions";
import { Alert } from "../../utils/alert";
import GoBackIcon from "../../components/GoBackIcon";

import { useTranslation } from "react-i18next";
import { namespaces } from "../../i18n/i18n.constants";

interface IProps {
  navigation: StackNavigationProp<AlmostDoneStackParamList, "AlmostDone">;
}
const AlmostDone = ({ navigation }: IProps) => {
  const { t, i18n } = useTranslation(namespaces.welcome.almostDone);
  const changeOnboardingState = useStoreActions((store) => store.changeOnboardingState);

  // Name
  const name = useStoreState((store) => store.settings.name);
  const changeName = useStoreActions((store) => store.settings.changeName);
  const onNamePress = async () => {
    Alert.prompt(
      t("general.name.title", { ns: namespaces.settings.settings }),
      t("general.name.dialog.msg", { ns: namespaces.settings.settings }),
      [
        {
          text: t("buttons.cancel", { ns: namespaces.common }),
          style: "cancel",
          onPress: () => {},
        },
        {
          text: t("general.name.dialog.accept", { ns: namespaces.settings.settings }),
          onPress: async (text) => {
            await changeName(text ?? null);
          },
        },
      ],
      "plain-text",
      name ?? "",
    );
  };

  // Pincode
  const loginMethods = useStoreState((store) => store.security.loginMethods);
  const onRemovePincodePress = () => navigation.navigate("RemovePincodeAuth");
  const onSetPincodePress = () => navigation.navigate("SetPincode");

  // Fingerprint
  const fingerprintAvailable = useStoreState((store) => store.security.fingerprintAvailable);
  const fingerPrintEnabled = useStoreState((store) => store.security.fingerprintEnabled);
  const biometricsSensor = useStoreState((store) => store.security.sensor);
  const onToggleFingerprintPress = async () => {
    navigation.navigate("ChangeFingerprintSettingsAuth");
  };

  // Fiat unit
  const fiatRates = useStoreState((store) => store.fiat.fiatRates);
  const currentFiatUnit = useStoreState((store) => store.settings.fiatUnit);
  const changeFiatUnit = useStoreActions((store) => store.settings.changeFiatUnit);
  const onFiatUnitPress = async () => {
    if (PLATFORM === "android") {
      const { selectedItem } = await DialogAndroid.showPicker(null, null, {
        positiveText: null,
        negativeText: t("buttons.cancel", { ns: namespaces.common }),
        type: DialogAndroid.listRadio,
        selectedId: currentFiatUnit,
        items: [
          // TODO fiat rates
          { label: "USD", id: "USD" },
          { label: "EUR", id: "EUR" },
          { label: "SEK", id: "SEK" },
          { label: "JPY", id: "JPY" },
          { label: "CNY", id: "CNY" },
          { label: "SGD", id: "SGD" },
          { label: "HKD", id: "HKD" },
          { label: "CAD", id: "CAD" },
          { label: "NZD", id: "NZD" },
          { label: "AUD", id: "AUD" },
          { label: "CLP", id: "CLP" },
          { label: "GBP", id: "GBP" },
          { label: "DKK", id: "DKK" },
          { label: "ISK", id: "ISK" },
          { label: "CHF", id: "CHF" },
          { label: "BRL", id: "BRL" },
          { label: "RUB", id: "RUB" },
          { label: "PLN", id: "PLN" },
          { label: "THB", id: "THB" },
          { label: "KRW", id: "KRW" },
          { label: "TWD", id: "TWD" },
        ],
      });
      if (selectedItem) {
        changeFiatUnit(selectedItem.id);
      }
    } else {
      navigation.navigate("ChangeFiatUnit", {
        title: t("display.fiatUnit.title", { ns: namespaces.settings.settings }),
        data: Object.entries(fiatRates).map(([currency]) => ({
          title: currency,
          value: currency as keyof IFiatRates,
        })),
        onPick: async (currency) => await changeFiatUnit(currency as keyof IFiatRates),
        searchEnabled: true,
      });
    }
  };

  // Autopilot
  const autopilotEnabled = useStoreState((store) => store.settings.autopilotEnabled);
  const changeAutopilotEnabled = useStoreActions((store) => store.settings.changeAutopilotEnabled);
  const onToggleAutopilotPress = () => {
    // TODO why not await?
    changeAutopilotEnabled(!autopilotEnabled);
  };

  const onPressContinue = async () => {
    await changeOnboardingState("DONE");
    navigation.pop();
  };

  return (
    <Container>
      <StatusBar
        barStyle="light-content"
        hidden={false}
        backgroundColor="transparent"
        animated={true}
        translucent={true}
      />
      {/* {PLATFORM !== "android" && <GoBackIcon style={style.goBack} />} */}
      <View style={style.content}>
        <View style={[style.upperContent]}>
          <List style={extraStyle.list}>
            <ListItem style={extraStyle.listItem} icon={true} onPress={onNamePress}>
              <Left>
                <Icon style={extraStyle.icon} type="AntDesign" name="edit" />
              </Left>
              <Body>
                <Text>{t("general.name.title", { ns: namespaces.settings.settings })}</Text>
                <Text note={true}>
                  {name || t("general.name.subtitle", { ns: namespaces.settings.settings })}
                </Text>
              </Body>
            </ListItem>

            <ListItem
              style={extraStyle.listItem}
              button={true}
              icon={true}
              onPress={
                loginMethods!.has(LoginMethods.pincode) ? onRemovePincodePress : onSetPincodePress
              }
            >
              <Left>
                <Icon style={extraStyle.icon} type="AntDesign" name="lock" />
              </Left>
              <Body>
                <Text>{t("security.pincode.title", { ns: namespaces.settings.settings })}</Text>
              </Body>
              <Right>
                <CheckBox
                  checked={loginMethods!.has(LoginMethods.pincode)}
                  onPress={
                    loginMethods!.has(LoginMethods.pincode)
                      ? onRemovePincodePress
                      : onSetPincodePress
                  }
                />
              </Right>
            </ListItem>

            {fingerprintAvailable && (
              <ListItem
                style={extraStyle.listItem}
                button={true}
                icon={true}
                onPress={onToggleFingerprintPress}
              >
                <Left>
                  {biometricsSensor !== "Face ID" && (
                    <Icon style={extraStyle.icon} type="Entypo" name="fingerprint" />
                  )}
                  {biometricsSensor === "Face ID" && (
                    <Icon
                      style={extraStyle.icon}
                      type="MaterialCommunityIcons"
                      name="face-recognition"
                    />
                  )}
                </Left>
                <Body>
                  <Text>
                    {t("security.biometrics.title", { ns: namespaces.settings.settings })}{" "}
                    {biometricsSensor === "Biometrics" && "fingerprint"}
                    {biometricsSensor === "Face ID" && "Face ID"}
                    {biometricsSensor === "Touch ID" && "Touch ID"}
                  </Text>
                </Body>
                <Right>
                  <CheckBox checked={fingerPrintEnabled} onPress={onToggleFingerprintPress} />
                </Right>
              </ListItem>
            )}

            <ListItem style={extraStyle.listItem} icon={true} onPress={onFiatUnitPress}>
              <Left>
                <Icon style={extraStyle.icon} type="FontAwesome" name="money" />
              </Left>
              <Body>
                <Text>{t("display.fiatUnit.title", { ns: namespaces.settings.settings })}</Text>
                <Text note={true} numberOfLines={1} onPress={onFiatUnitPress}>
                  {currentFiatUnit}
                </Text>
              </Body>
            </ListItem>

            <ListItem
              style={extraStyle.listItem}
              button={true}
              icon={true}
              onLongPress={() =>
                ToastAndroid.show(
                  "Open channels when on-chain funds are available",
                  ToastAndroid.SHORT,
                )
              }
              onPress={onToggleAutopilotPress}
            >
              <Left>
                <Icon style={extraStyle.icon} type="Entypo" name="circular-graph" />
              </Left>
              <Body>
                <Text>{t("autopilot.title")}</Text>
                <Text note={true} numberOfLines={1}>
                  {t("autopilot.msg")}
                </Text>
              </Body>
              <Right>
                <CheckBox checked={autopilotEnabled} onPress={onToggleAutopilotPress} />
              </Right>
            </ListItem>
          </List>
        </View>
        <View style={style.lowerContent}>
          <View style={style.text}>
            <H1 style={style.textHeader}>{t("done.title")}</H1>
            <Text>
              {t("done.msg1")}.{"\n\n"}
              {t("done.msg2")}.
            </Text>
          </View>
          <View style={style.buttons}>
            <Button style={style.button} block={true} onPress={onPressContinue}>
              <Text>{t("buttons.continue", { ns: namespaces.common })}</Text>
            </Button>
          </View>
        </View>
      </View>
    </Container>
  );
};

const extraStyle = StyleSheet.create({
  list: {
    paddingTop: 12,
    marginBottom: 48,
  },
  listItem: {
    paddingLeft: 8,
    paddingRight: 8,
    // paddingLeft: 24,
    // paddingRight: 24,
  },
  itemHeader: {
    paddingLeft: 8,
    paddingRight: 8,
    // paddingRight: 24,
    // paddingLeft: 24,
    paddingTop: 24,
    paddingBottom: 16,
  },
  icon: {
    fontSize: 22,
  },
});

const Stack = createStackNavigator();

export type AlmostDoneStackParamList = {
  AlmostDone: undefined;
  RemovePincodeAuth: undefined;
  SetPincode: undefined;
  ChangeFingerprintSettingsAuth: undefined;
  ChangeFiatUnit: ISelectListNavigationProps<keyof IFiatRates>;
};
export default () => {
  const screenOptions: StackNavigationOptions = {
    ...useStackNavigationOptions(),
    animation: "none",
  };

  return (
    <Stack.Navigator initialRouteName="AlmostDone" screenOptions={screenOptions}>
      <Stack.Screen name="AlmostDone" component={AlmostDone} />
      <Stack.Screen name="RemovePincodeAuth" component={RemovePincodeAuth} />
      <Stack.Screen name="SetPincode" component={SetPincode} />
      <Stack.Screen
        name="ChangeFingerprintSettingsAuth"
        component={ChangeFingerprintSettingsAuth}
      />
      <Stack.Screen name="ChangeFiatUnit" component={SelectList} />
    </Stack.Navigator>
  );
};

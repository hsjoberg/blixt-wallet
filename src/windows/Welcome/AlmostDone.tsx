import React from "react";
import { StatusBar, StyleSheet, ToastAndroid } from "react-native";
import { Body, Icon, Text, View, Button, H1, List, Left, ListItem, Right, CheckBox } from "native-base";
import DialogAndroid from "react-native-dialogs";

import { useStoreState, useStoreActions } from "../../state/store";
import { NavigationScreenProp} from "react-navigation";
import { createStackNavigator } from "react-navigation-stack";
import { blixtTheme } from "../../../native-base-theme/variables/commonColor";
import style from "./style";
import { LoginMethods } from "../../state/Security";
import Container from "../../components/Container";
import Content from "../../components/Content";

import SetPincode from "../Settings/SetPincode";
import RemovePincodeAuth from "../Settings/RemovePincodeAuth";
import ChangeFingerprintSettingsAuth from "../Settings/ChangeFingerprintSettingsAuth";

interface IProps {
  navigation: NavigationScreenProp<{}>;
}
export const AlmostDone = ({ navigation }: IProps) => {
  // Name
  const name = useStoreState((store) => store.settings.name);
  const changeName = useStoreActions((store) => store.settings.changeName);
  const onNamePress = async () => {
    const { action, text } = await DialogAndroid.prompt("Name", "Choose a name that will be shown to people who pay to you", {
      defaultValue: name,
    });
    if (action === DialogAndroid.actionPositive) {
      await changeName(text);
    }
  };

  // Pincode
  const loginMethods = useStoreState((store) => store.security.loginMethods);
  const onRemovePincodePress = () => navigation.navigate("RemovePincodeAuth");
  const onSetPincodePress = () => navigation.navigate("SetPincode");

  // Fingerprint
  const fingerprintAvailable = useStoreState((store) => store.security.fingerprintAvailable);
  const fingerPrintEnabled = useStoreState((store) => store.security.fingerprintEnabled);
  const onToggleFingerprintPress = async () => {
    navigation.navigate("ChangeFingerprintSettingsAuth");
  }

  // Fiat unit
  const currentFiatUnit = useStoreState((store) => store.settings.fiatUnit);
  const changeFiatUnit = useStoreActions((store) => store.settings.changeFiatUnit);
  const onFiatUnitPress = async () => {
    const { selectedItem } = await DialogAndroid.showPicker(null, null, {
      positiveText: null,
      negativeText: "Cancel",
      type: DialogAndroid.listRadio,
      selectedId: currentFiatUnit,
      items: [
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
      ]
    });
    if (selectedItem) {
      changeFiatUnit(selectedItem.id);
    }
  }

    // Autopilot
    const autopilotEnabled = useStoreState((store) => store.settings.autopilotEnabled);
    const changeAutopilotEnabled = useStoreActions((store) => store.settings.changeAutopilotEnabled);
    const onToggleAutopilotPress = () => { // TODO why not await?
      changeAutopilotEnabled(!autopilotEnabled);
    }

  return (
    <Container>
      <StatusBar
        backgroundColor={blixtTheme.dark}
        hidden={false}
        translucent={false}
        networkActivityIndicatorVisible={true}
        barStyle="light-content"
      />
      <Content style={{ flex: 1, padding: 0 }}>
        <View style={[style.upperContent, { paddingTop: 40 }]}>
          <List style={extraStyle.list}>
            <ListItem style={extraStyle.listItem} icon={true} onPress={onNamePress}>
              <Left><Icon style={extraStyle.icon} type="AntDesign" name="edit" /></Left>
              <Body>
                <Text>Name</Text>
                <Text note={true} numberOfLines={1}>Will be shown to those who pay you.</Text>
              </Body>
            </ListItem>

            <ListItem style={extraStyle.listItem} button={true} icon={true} onPress={loginMethods!.has(LoginMethods.pincode) ? onRemovePincodePress : onSetPincodePress}>
              <Left><Icon style={extraStyle.icon} type="AntDesign" name="lock" /></Left>
              <Body><Text>Login with pincode</Text></Body>
              <Right><CheckBox checked={loginMethods!.has(LoginMethods.pincode)} onPress={loginMethods!.has(LoginMethods.pincode) ? onRemovePincodePress : onSetPincodePress} /></Right>
            </ListItem>

            {fingerprintAvailable &&
              <ListItem style={extraStyle.listItem} button={true} icon={true} onPress={onToggleFingerprintPress}>
                <Left><Icon style={extraStyle.icon} type="Entypo" name="fingerprint" /></Left>
                <Body><Text>Login with fingerprint</Text></Body>
                <Right><CheckBox checked={fingerPrintEnabled} onPress={onToggleFingerprintPress}/></Right>
              </ListItem>
            }

            <ListItem style={extraStyle.listItem} icon={true} onPress={onFiatUnitPress}>
              <Left><Icon style={extraStyle.icon} type="FontAwesome" name="money" /></Left>
              <Body>
                <Text>Fiat currency</Text>
                <Text note={true} numberOfLines={1} onPress={onFiatUnitPress}>{currentFiatUnit}</Text>
              </Body>
            </ListItem>

            <ListItem style={extraStyle.listItem} button={true} icon={true} onLongPress={() => ToastAndroid.show("Open channels when on-chain funds are available", ToastAndroid.SHORT)} onPress={onToggleAutopilotPress}>
              <Left><Icon style={extraStyle.icon} type="Entypo" name="circular-graph" /></Left>
              <Body>
                <Text>Auto-open channels</Text>
                <Text note={true} numberOfLines={1}>Open channels when on-chain funds are available</Text>
              </Body>
              <Right><CheckBox checked={autopilotEnabled} onPress={onToggleAutopilotPress} /></Right>
          </ListItem>
          </List>
        </View>
        <View style={style.lowerContent}>
          <View style={style.text}>
            <H1 style={style.textHeader}>Almost done!</H1>
            <Text>
              Here are some wallet settings you can set up to your liking.{"\n"}
              When you are ready, press continue.
            </Text>
          </View>
          <View style={style.buttons}>
            <Button style={style.button} block={true} onPress={() => navigation.navigate("InitLightning")}>
              <Text>Continue</Text>
            </Button>
          </View>
        </View>
      </Content>
    </Container>
  );
}

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

export default createStackNavigator({
  AlmostDone,
  RemovePincodeAuth,
  SetPincode,
  ChangeFingerprintSettingsAuth,
}, {
  headerMode: "none",
  initialRouteName: "AlmostDone",
  transparentCard: true,
});

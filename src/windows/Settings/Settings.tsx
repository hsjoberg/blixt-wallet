import React from "react";
import { Alert, StyleSheet, Clipboard } from "react-native";
import { CheckBox, Button, Body, Container, Icon, Header, Text, Title, Left, Content, List, ListItem, Right, Toast } from "native-base";
import DialogAndroid from "react-native-dialogs";

import { NavigationScreenProp } from "react-navigation";
import { useStoreActions, useStoreState } from "../../state/store";
import { LoginMethods } from "../../state/Security";
import { BitcoinUnits } from "../../utils/bitcoin-units";

interface ISettingsProps {
  navigation: NavigationScreenProp<{}>;
}
export default ({ navigation }: ISettingsProps) => {
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

  // Seed
  const seedAvailable = useStoreState((store) => store.security.seedAvailable);
  const getSeed = useStoreActions((store) => store.security.getSeed);
  const deleteSeedFromDevice = useStoreActions((store) => store.security.deleteSeedFromDevice);

  const onGetSeedPress = async () => {
    const seed = await getSeed()
    if (seed) {
      Alert.alert("Seed", seed.join(" "), [{
        text: "Copy seed",
        onPress: async () => {
          Clipboard.setString(seed.join(" "));
          Toast.show({
            text: "Copied to clipboard.",
            type: "warning",
          });
        }
      }, {
        text: "OK",
      }]);
    }
  }

  const onRemoveSeedPress = async () => {
    Alert.alert("Remove seed", "This will permanently remove the seed from this device. Only do this is you have backed up your seed!", [{
      text: "Cancel",
    }, {
      text: "Delete seed",
      onPress: async () => await deleteSeedFromDevice(),
    }]);
  }

  // Bitcoin unit
  const currentBitcoinUnit = useStoreState((store) => store.settings.bitcoinUnit);
  const changeBitcoinUnit = useStoreActions((store) => store.settings.changeBitcoinUnit);
  const onBitcoinUnitPress = async () => {
    const { selectedItem } = await DialogAndroid.showPicker(null, null, {
      positiveText: null,
      negativeText: "Cancel",
      type: DialogAndroid.listRadio,
      selectedId: currentBitcoinUnit,
      items: [
        { label: BitcoinUnits.bitcoin.settings, id: "bitcoin" },
        { label: BitcoinUnits.bit.settings, id: "bit" },
        { label: BitcoinUnits.satoshi.settings, id: "satoshi" },
        { label: BitcoinUnits.milliBitcoin.settings, id: "milliBitcoin" },
      ]
    });
    if (selectedItem) {
      changeBitcoinUnit(selectedItem.id);
    }
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

  // Autopilot
  const autopilotEnabled = useStoreState((store) => store.settings.autopilotEnabled);
  const changeAutopilotEnabled = useStoreActions((store) => store.settings.changeAutopilotEnabled);
  const setupAutopilot = useStoreActions((store) => store.lightning.setupAutopilot);
  const onToggleAutopilotPress = () => {
    changeAutopilotEnabled(!autopilotEnabled);
    setupAutopilot(!autopilotEnabled);
  }

  return (
    <Container>
      <Header iosBarStyle="light-content" translucent={false}>
        <Left>
          <Button transparent={true} onPress={() => navigation.pop()}>
            <Icon name="arrow-back" />
          </Button>
        </Left>
        <Body>
          <Title>Settings</Title>
        </Body>
      </Header>
      <Content style={{ paddingLeft: 16, paddingRight: 16 }}>
        <List style={style.list}>
          <ListItem style={style.itemHeader} itemHeader={true} first={true}>
            <Text>Wallet</Text>
          </ListItem>

          <ListItem style={style.listItem} button={true} icon={true} onPress={loginMethods!.has(LoginMethods.pincode) ? onRemovePincodePress : onSetPincodePress}>
            <Left><Icon style={style.icon} type="AntDesign" name="lock" /></Left>
            <Body><Text>Login with pincode</Text></Body>
            <Right><CheckBox checked={loginMethods!.has(LoginMethods.pincode)} onPress={loginMethods!.has(LoginMethods.pincode) ? onRemovePincodePress : onSetPincodePress} /></Right>
          </ListItem>
          {fingerprintAvailable &&
            <ListItem style={style.listItem} button={true} icon={true} onPress={onToggleFingerprintPress}>
              <Left><Icon style={style.icon} type="Entypo" name="fingerprint" /></Left>
              <Body><Text>Login with fingerprint</Text></Body>
              <Right><CheckBox checked={fingerPrintEnabled} onPress={onToggleFingerprintPress}/></Right>
            </ListItem>
          }
          {seedAvailable &&
            <>
              <ListItem style={style.listItem} button={true} icon={true} onPress={onGetSeedPress}>
                <Left><Icon style={style.icon} type="AntDesign" name="form" /></Left>
                <Body>
                  <Text>Show mnemonic</Text>
                  <Text note={true} numberOfLines={1}>Show 24-word seed for this wallet</Text>
                </Body>
              </ListItem>
              <ListItem style={style.listItem} button={true} icon={true} onPress={onRemoveSeedPress}>
                <Left><Icon style={style.icon} type="Entypo" name="eraser" /></Left>
                <Body>
                  <Text>Remove mnemonic from device</Text>
                  <Text note={true} numberOfLines={1}>Permanently remove the seed from this device.</Text>
                </Body>
              </ListItem>
            </>
          }


          <ListItem style={style.itemHeader} itemHeader={true}>
            <Text>Display</Text>
          </ListItem>

          <ListItem style={style.listItem} icon={true} onPress={onFiatUnitPress}>
            <Left><Icon style={style.icon} type="FontAwesome" name="money" /></Left>
            <Body>
              <Text>Fiat currency</Text>
              <Text note={true} numberOfLines={1} onPress={onFiatUnitPress}>{currentFiatUnit}</Text>
            </Body>
          </ListItem>
          <ListItem style={style.listItem} icon={true} onPress={onBitcoinUnitPress}>
            <Left><Icon style={style.icon} type="FontAwesome5" name="btc" /></Left>
            <Body>
              <Text>Bitcoin unit</Text>
              <Text note={true} numberOfLines={1} onPress={onBitcoinUnitPress}>{BitcoinUnits[currentBitcoinUnit].settings}</Text>
            </Body>
          </ListItem>


          {/* <ListItem style={style.itemHeader} itemHeader={true}>
            <Text>Bitcoin Network</Text>
          </ListItem>

          <ListItem style={style.listItem} icon={true} onPress={() => {}}>
            <Left><Icon style={style.icon} type="AntDesign" name="team" /></Left>
            <Body><Text>Show current network peer(s)</Text></Body>
          </ListItem>
          <ListItem style={style.listItem} icon={true} onPress={() => {}}>
            <Left><Icon style={style.icon} type="AntDesign" name="customerservice" /></Left>
            <Body><Text>Set trusted Node for SPV</Text></Body>
          </ListItem> */}


          <ListItem style={style.itemHeader} itemHeader={true}>
            <Text>Lightning Network</Text>
          </ListItem>

          <ListItem style={style.listItem} icon={true} onPress={onNamePress}>
            <Left><Icon style={style.icon} type="AntDesign" name="edit" /></Left>
            <Body>
              <Text>Name</Text>
              <Text note={true} numberOfLines={1}>Will be shown to those who pay you.</Text>
            </Body>
          </ListItem>
          <ListItem style={style.listItem} icon={true} onPress={() => navigation.navigate("LightningNodeInfo")}>
            <Left><Icon style={style.icon} type="AntDesign" name="user" /></Left>
            <Body><Text>Show node data</Text></Body>
          </ListItem>
          <ListItem style={style.listItem} button={true} icon={true} onPress={onToggleAutopilotPress}>
            <Left><Icon style={style.icon} type="Entypo" name="circular-graph" /></Left>
            <Body><Text>Automatically open channels</Text></Body>
            <Right><CheckBox checked={autopilotEnabled} onPress={onToggleAutopilotPress} /></Right>
          </ListItem>
          {/* <ListItem style={style.listItem} button={true} icon={true} onPress={() => {}}>
            <Left><Icon style={style.icon} type="Entypo" name="fingerprint" /></Left>
            <Body><Text>Backup channels to Google Drive</Text></Body>
            <Right><CheckBox checked={false} /></Right>
          </ListItem> */}


          {/* <ListItem style={style.itemHeader} itemHeader={true}>
            <Text>Advanced</Text>
          </ListItem>

          <ListItem style={style.listItem} icon={true} onPress={() => {}}>
            <Left><Icon style={style.icon} type="Entypo" name="text" /></Left>
            <Body><Text>Open lnd log</Text></Body>
          </ListItem> */}


          <ListItem style={style.itemHeader} itemHeader={true}>
            <Text>Misc.</Text>
          </ListItem>

          <ListItem style={style.listItem} icon={true} onPress={() => navigation.navigate("About")}>
            <Left><Icon style={style.icon} type="AntDesign" name="info" /></Left>
            <Body><Text>About</Text></Body>
          </ListItem>
          {(name === "Hampus" || __DEV__ === true) &&
            <ListItem style={style.listItem} icon={true} onPress={() => navigation.navigate("DEV_Commands")}>
              <Left><Icon style={style.icon} type="MaterialIcons" name="developer-mode" /></Left>
              <Body><Text>Go to dev screen</Text></Body>
            </ListItem>
          }
        </List>
      </Content>
    </Container>
  );
};

const style = StyleSheet.create({
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

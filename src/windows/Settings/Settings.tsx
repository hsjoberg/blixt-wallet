import React from "react";
import { Alert, StyleSheet, NativeModules, ToastAndroid, PermissionsAndroid } from "react-native";
import Clipboard from "@react-native-community/react-native-clipboard";
import DocumentPicker from "react-native-document-picker";
import { readFile } from "react-native-fs";
import { CheckBox, Button, Body, Container, Icon, Header, Text, Title, Left, List, ListItem, Right, Toast } from "native-base";
import DialogAndroid from "react-native-dialogs";
import { fromUnixTime } from "date-fns";
import { StackNavigationProp } from "@react-navigation/stack";
import Geolocation from "@react-native-community/geolocation";

import { SettingsStackParamList } from "./index";
import Content from "../../components/Content";
import { useStoreActions, useStoreState } from "../../state/store";
import { LoginMethods } from "../../state/Security";
import { BitcoinUnits } from "../../utils/bitcoin-units";
import { verifyChanBackup } from "../../lndmobile/channel";
import { camelCaseToSpace, formatISO, toast } from "../../utils";
import { MapStyle } from "../../utils/google-maps";
import { Chain } from "../../utils/build";

interface ISettingsProps {
  navigation: StackNavigationProp<SettingsStackParamList, "Settings">;
}
export default ({ navigation }: ISettingsProps) => {
  const rpcReady = useStoreState((store) => store.lightning.rpcReady);

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
    Alert.alert("Remove seed", "This will permanently remove the seed from this device. Only do this if you have backed up your seed!", [{
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
    const { action, text } = await DialogAndroid.prompt("Name", "Choose a name that will be used in transactions", {
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
  const onToggleAutopilotPress = () => { // TODO why not await?
    if (!rpcReady) {
      return;
    }
    changeAutopilotEnabled(!autopilotEnabled);
    setupAutopilot(!autopilotEnabled);
  }

  // Push Notifications
  const pushNotificationsEnabled = useStoreState((store) => store.settings.pushNotificationsEnabled);
  const changePushNotificationsEnabled = useStoreActions((store) => store.settings.changePushNotificationsEnabled);
  const onTogglePushNotificationsPress = async () => {
    await changePushNotificationsEnabled(!pushNotificationsEnabled);
  }

  // Clipboard invoice check
  const clipboardInvoiceCheckEnabled = useStoreState((store) => store.settings.clipboardInvoiceCheckEnabled);
  const changeClipboardInvoiceCheckEnabled = useStoreActions((store) => store.settings.changeClipboardInvoiceCheckEnabled);
  const checkInvoice = useStoreActions((store) => store.clipboardManager.checkInvoice);
  const onToggleClipBoardInvoiceCheck = async () => {
    await changeClipboardInvoiceCheckEnabled(!clipboardInvoiceCheckEnabled);
    const clipboardText = await Clipboard.getString();
    await checkInvoice(clipboardText);

  };

  // Copy log
  const copyLog = async () => {
    try {
      await NativeModules.LndMobile.copyLndLog();
      Toast.show({
        text: "Copied lnd log file.",
        type: "warning",
      });
    } catch (e) {
      console.error(e);
      Toast.show({
        text: "Error copying lnd log file.",
        type: "danger",
      });
    }
  };

  // Export channels
  const exportChannelsBackup = useStoreActions((store) => store.channel.exportChannelsBackup);
  const onExportChannelsPress = async () => {
    try {
      const response = await exportChannelsBackup();
      Toast.show({
        text: `File written:\n ${response}`,
        type: "warning",
        duration: 10000,
      });
    } catch (e) {
      console.log(e);
      Toast.show({
        text: e.message,
        type: "danger",
        duration: 10000,
      });
    }
  }

  // Verify channels backup
  const onVerifyChannelsBackupPress = async () => {
    try {
      const res = await DocumentPicker.pick({
        type: [DocumentPicker.types.allFiles],
      });
      const backupBase64 = await readFile(res.uri, "base64");
      console.log(await verifyChanBackup(backupBase64));
    } catch (e) {
      console.log(e);
    }
  }

  // Scheduled sync
  const workInfo = useStoreState((store) => store.scheduledSync.workInfo);
  const lastScheduledSync = useStoreState((store) => store.scheduledSync.lastScheduledSync);
  const lastScheduledSyncAttempt = useStoreState((store) => store.scheduledSync.lastScheduledSyncAttempt);
  console.log(workInfo, lastScheduledSync, lastScheduledSyncAttempt);

  const scheduledSyncEnabled = useStoreState((store) => store.settings.scheduledSyncEnabled);
  const changeScheduledSyncEnabled = useStoreActions((store) => store.settings.changeScheduledSyncEnabled);
  const setSyncEnabled = useStoreActions((store) => store.scheduledSync.setSyncEnabled);
  const onToggleScheduledSyncEnabled = async () => {
    if (scheduledSyncEnabled)
      Alert.alert("Not recommended", "Warning. It is not recommended to disable scheduled chain sync.\n\n" +
                                     "Make sure you keep up-to-date with the network otherwise you risk losing your funds.\n\n" +
                                     "Only do this if you're know what you're doing.",
      [{
        text: "Cancel",
      }, {
        text: "Proceed",
        onPress: async () => {
          await setSyncEnabled(!scheduledSyncEnabled);
          await changeScheduledSyncEnabled(!scheduledSyncEnabled);
        }
      }]);
    else {
      await setSyncEnabled(!scheduledSyncEnabled);
      await changeScheduledSyncEnabled(!scheduledSyncEnabled);
    }
  }

  // Debug show startup info
  const debugShowStartupInfo = useStoreState((store) => store.settings.debugShowStartupInfo);
  const changeDebugShowStartupInfo = useStoreActions((store) => store.settings.changeDebugShowStartupInfo);
  const onToggleDebugShowStartupInfo = async () => {
    await changeDebugShowStartupInfo(!debugShowStartupInfo);
  };

  const googleDriveBackupEnabled = useStoreState((store) => store.settings.googleDriveBackupEnabled);
  const changeGoogleDriveBackupEnabled = useStoreActions((store) => store.settings.changeGoogleDriveBackupEnabled);
  const googleSignIn = useStoreActions((store) => store.google.signIn);
  const googleSignOut = useStoreActions((store) => store.google.signOut);
  const googleIsSignedIn = useStoreState((store) => store.google.isSignedIn);
  const googleDriveMakeBackup = useStoreActions((store) => store.googleDriveBackup.makeBackup);
  const onToggleGoogleDriveBackup = async () => {
    if (!googleIsSignedIn) {
      await googleSignIn();
      await googleDriveMakeBackup();
      await changeGoogleDriveBackupEnabled(true);
      toast("Google Drive backup enabled");
    }
    else {
      await googleSignOut();
      await changeGoogleDriveBackupEnabled(false);
    }
  };

  const onDoGoogleDriveBackupPress = async () => {
    try {
      await googleDriveMakeBackup();
      toast("Backed up channels to Google Drive");
    }
    catch (e) {
      toast(`Error backup up: ${e.message}`, 10000, "danger");
    }
  }

  // Transaction geolocation
  const transactionGeolocationEnabled = useStoreState((store) => store.settings.transactionGeolocationEnabled);
  const changeTransactionGeolocationEnabled = useStoreActions((store) => store.settings.changeTransactionGeolocationEnabled);
  const onToggleTransactionGeolocationEnabled = async () => {
    if (!transactionGeolocationEnabled) {
      try {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        );
        console.log(granted);
        if (granted === PermissionsAndroid.RESULTS.GRANTED) {
          console.log('Geolocation granted');
        } else {
          console.log('Geolocation permission denied');
          return;
        }
      } catch (err) {
        console.warn(err);
      }
    }
    await changeTransactionGeolocationEnabled(!transactionGeolocationEnabled);
  };

  // Transaction geolocation map style
  const transactionGeolocationMapStyle = useStoreState((store) => store.settings.transactionGeolocationMapStyle);
  const changeTransactionGeolocationMapStyle = useStoreActions((store) => store.settings.changeTransactionGeolocationMapStyle);
  const onChangeMapStylePress = async () => {
    const { selectedItem } = await DialogAndroid.showPicker(null, null, {
      positiveText: null,
      negativeText: "Cancel",
      type: DialogAndroid.listRadio,
      selectedId: transactionGeolocationMapStyle,
      items: Object.keys(MapStyle).map((mapStyle) => ({
        id: mapStyle,
        label: camelCaseToSpace(mapStyle),
      }),
    )});

    if (selectedItem) {
      await changeTransactionGeolocationMapStyle(selectedItem.id);
    }
  };


  const experimentWeblnBrowserEnabled = useStoreState((store) => store.settings.experimentWeblnEnabled);
  const changeExperimentWeblnBrowserEnabled = useStoreActions((store) => store.settings.changeExperimentWeblnEnabled);
  const onExperimentWeblnBrowserEnabledToggle = async () => {
    await changeExperimentWeblnBrowserEnabled(!experimentWeblnBrowserEnabled);
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
      <Content>
        <List style={style.list}>
          <ListItem style={style.itemHeader} itemHeader={true} first={true}>
            <Text>Wallet</Text>
          </ListItem>

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
                  <Text note={true} numberOfLines={1}>Permanently remove the seed from this device</Text>
                </Body>
              </ListItem>
            </>
          }
          <ListItem style={style.listItem} button={true} icon={true} onPress={onTogglePushNotificationsPress}>
            <Left><Icon style={style.icon} type="Entypo" name="bell" /></Left>
            <Body>
              <Text>Push notifications</Text>
              <Text note={true} numberOfLines={1}>When the app is on. For channel events</Text>
            </Body>
            <Right><CheckBox checked={pushNotificationsEnabled} onPress={onTogglePushNotificationsPress} /></Right>
          </ListItem>
          <ListItem style={style.listItem} icon={true} onPress={onToggleClipBoardInvoiceCheck}>
            <Left><Icon style={style.icon} type="Entypo" name="clipboard" /></Left>
            <Body>
              <Text>Check clipboard for invoices</Text>
              <Text note={true} numberOfLines={1}>Automatically check clipboard for Lightning invoices</Text>
            </Body>
            <Right><CheckBox checked={clipboardInvoiceCheckEnabled} onPress={onToggleClipBoardInvoiceCheck} /></Right>
          </ListItem>
          <ListItem style={style.listItem} icon={true} onPress={onExportChannelsPress}>
            <Left><Icon style={style.icon} type="MaterialIcons" name="backup" /></Left>
            <Body>
              <Text>Export channel backup</Text>
            </Body>
          </ListItem>
          {(name === "Hampus" || __DEV__ === true) &&
            <ListItem style={style.listItem} icon={true} onPress={onVerifyChannelsBackupPress}>
              <Left><Icon style={style.icon} type="MaterialIcons" name="backup" /></Left>
              <Body>
                <Text>Verify channel backup</Text>
              </Body>
            </ListItem>
          }
          <ListItem style={style.listItem} icon={true} onPress={onToggleGoogleDriveBackup}>
            <Left><Icon style={style.icon} type="MaterialCommunityIcons" name="google-drive" /></Left>
            <Body>
              <Text>Google Drive channel backup</Text>
              <Text note={true} numberOfLines={1}>Automatically backup channels to Google Drive</Text>
            </Body>
            <Right><CheckBox checked={googleDriveBackupEnabled} onPress={onToggleGoogleDriveBackup} /></Right>
          </ListItem>
          {googleDriveBackupEnabled &&
            <ListItem style={style.listItem} icon={true} onPress={onDoGoogleDriveBackupPress}>
              <Left><Icon style={style.icon} type="MaterialCommunityIcons" name="folder-google-drive" /></Left>
              <Body><Text>Manually trigger Google Drive Backup</Text></Body>
            </ListItem>
          }
          <ListItem style={style.listItem} icon={true} onPress={onToggleTransactionGeolocationEnabled}>
            <Left><Icon style={style.icon} type="Entypo" name="location-pin" /></Left>
            <Body>
              <Text>Save geolocation of transaction</Text>
              <Text note={true} numberOfLines={1}>Locally save the location of a transaction</Text>
            </Body>
            <Right><CheckBox checked={transactionGeolocationEnabled} onPress={onToggleTransactionGeolocationEnabled} /></Right>
          </ListItem>
          {transactionGeolocationEnabled &&
            <ListItem style={style.listItem} icon={true} onPress={onChangeMapStylePress}>
              <Left><Icon style={style.icon} type="MaterialCommunityIcons" name="google-maps" /></Left>
              <Body>
                <Text>Set Map theme</Text>
                <Text note={true}>{camelCaseToSpace(transactionGeolocationMapStyle)}</Text>
              </Body>
            </ListItem>
          }

          <ListItem style={style.itemHeader} itemHeader={true}>
            <Text>Security</Text>
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
          <ListItem
            style={style.listItem} icon={true} onPress={onToggleScheduledSyncEnabled}
            onLongPress={() => ToastAndroid.show("Status: " + workInfo + "\n"+
                                                 "Last sync attempt: " + formatISO(fromUnixTime(lastScheduledSyncAttempt)) + "\n" +
                                                 "Last sync: " + formatISO(fromUnixTime(lastScheduledSync)), ToastAndroid.LONG)}
          >
            <Left><Icon style={style.icon} type="MaterialCommunityIcons" name="sync-alert" /></Left>
            <Body>
              <Text>Scheduled chain sync</Text>
              <Text note={true} numberOfLines={1}>
                Runs in background every 4 hours
              </Text>
            </Body>
            <Right><CheckBox checked={scheduledSyncEnabled} onPress={onToggleScheduledSyncEnabled} /></Right>
          </ListItem>


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
              <Text note={true} numberOfLines={1}>Will be used in transactions</Text>
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
          <ListItem style={style.listItem} icon={true} onPress={() => copyLog()}>
            <Left><Icon style={style.icon} type="AntDesign" name="copy1" /></Left>
            <Body>
              <Text>Copy log to local storage</Text>
              <Text note={true} numberOfLines={1}>Reached from /sdcard/BlixtWallet</Text>
            </Body>
          </ListItem>
          {(name === "Hampus" || __DEV__ === true) &&
            <ListItem style={style.listItem} icon={true} onPress={() => navigation.navigate("DEV_CommandsX")}>
              <Left><Icon style={style.icon} type="MaterialIcons" name="developer-mode" /></Left>
              <Body><Text>Go to dev screen</Text></Body>
            </ListItem>
          }

          {Chain === "mainnet" &&
            <>
              <ListItem style={style.itemHeader} itemHeader={true}>
                <Text>Experiments</Text>
              </ListItem>
              <ListItem style={style.listItem} icon={true} onPress={onExperimentWeblnBrowserEnabledToggle}>
                <Left><Icon style={style.icon} type="MaterialIcons" name="local-grocery-store" /></Left>
                <Body>
                  <Text>Enable WebLN browser</Text>
                  <Text note={true}>Shows up as an icon on the Overview screen</Text>
                </Body>
                <Right><CheckBox checked={experimentWeblnBrowserEnabled} onPress={onExperimentWeblnBrowserEnabledToggle} /></Right>
              </ListItem>
            </>
          }

          <ListItem style={style.itemHeader} itemHeader={true}>
            <Text>Debug</Text>
          </ListItem>
          <ListItem style={style.listItem} button={true} icon={true} onPress={onToggleDebugShowStartupInfo}>
            <Left><Icon style={style.icon} type="MaterialCommunityIcons" name="android-debug-bridge" /></Left>
            <Body><Text>Show startup info notications</Text></Body>
            <Right><CheckBox checked={debugShowStartupInfo} onPress={onToggleDebugShowStartupInfo} /></Right>
          </ListItem>
          {(name === "Hampus" || __DEV__ === true) &&
            <>
              <ListItem style={style.listItem} icon={true} onPress={() => navigation.navigate("KeysendTest")}>
                <Left><Icon style={style.icon} type="MaterialIcons" name="developer-mode" /></Left>
                <Body><Text>Keysend Test</Text></Body>
              </ListItem>
              <ListItem style={style.listItem} icon={true} onPress={() => navigation.navigate("GoogleDriveTestbed")}>
                <Left><Icon style={style.icon} type="Entypo" name="google-drive" /></Left>
                <Body><Text>Google Drive Testbed</Text></Body>
              </ListItem>
              <ListItem style={style.listItem} icon={true} onPress={() => navigation.navigate("WebLNBrowser")}>
                <Left><Icon style={style.icon} type="MaterialIcons" name="local-grocery-store" /></Left>
                <Body><Text>WebLN</Text></Body>
              </ListItem>
            </>
          }
        </List>
      </Content>
    </Container>
  );
};

const style = StyleSheet.create({
  list: {
    paddingTop: 6,
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

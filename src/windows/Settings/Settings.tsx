import React, { useLayoutEffect } from "react";
import { StyleSheet, NativeModules, PermissionsAndroid, Linking, Platform } from "react-native";
import Clipboard from "@react-native-community/clipboard";
import DocumentPicker from "react-native-document-picker";
import { readFile } from "react-native-fs";
import ReactNativePermissions from 'react-native-permissions';
import { CheckBox, Body, Container, Icon, Text, Left, List, ListItem, Right } from "native-base";
import DialogAndroid from "react-native-dialogs";
import { fromUnixTime } from "date-fns";
import { StackNavigationProp } from "@react-navigation/stack";

import { SettingsStackParamList } from "./index";
import Content from "../../components/Content";
import { useStoreActions, useStoreState } from "../../state/store";
import { LoginMethods } from "../../state/Security";
import { BitcoinUnits, IBitcoinUnits } from "../../utils/bitcoin-units";
import { verifyChanBackup } from "../../lndmobile/channel";
import { camelCaseToSpace, formatISO, toast } from "../../utils";
import { MapStyle } from "../../utils/google-maps";
import { OnchainExplorer } from "../../state/Settings";
import TorSvg from "./TorSvg";
import { DEFAULT_DUNDER_SERVER, DEFAULT_NEUTRINO_NODE, PLATFORM } from "../../utils/constants";
import { IFiatRates } from "../../state/Fiat";
import BlixtWallet from "../../components/BlixtWallet";
import { Alert } from "../../utils/alert";
import { Chain } from "../../utils/build";
import { getNodeInfo } from "../../lndmobile";

interface ISettingsProps {
  navigation: StackNavigationProp<SettingsStackParamList, "Settings">;
}
export default function Settings({ navigation }: ISettingsProps) {
  useLayoutEffect(() => {
    navigation.setOptions({
      headerTitle: "Settings",
      headerBackTitle: "Back",
      headerShown: true,
    });
  }, [navigation]);

  const onboardingState = useStoreState((store) => store.onboardingState);
  const rpcReady = useStoreState((store) => store.lightning.rpcReady);
  const isRecoverMode = useStoreState((store) => store.lightning.isRecoverMode);

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
          toast("Copied to clipboard", undefined, "warning");
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
    if (PLATFORM === "android") {
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
    } else {
      navigation.navigate("ChangeBitcoinUnit", {
        title: "Change bitcoin unit",
        data: [
          { title: BitcoinUnits.bitcoin.settings, value: "bitcoin" },
          { title: BitcoinUnits.bit.settings, value: "bit" },
          { title: BitcoinUnits.satoshi.settings, value: "satoshi" },
          { title: BitcoinUnits.milliBitcoin.settings, value: "milliBitcoin" },
        ],
        onPick: async (currency) => await changeBitcoinUnit(currency as keyof IBitcoinUnits),
      });
    }
  }

  // Fiat unit
  const fiatRates = useStoreState((store) => store.fiat.fiatRates);
  const currentFiatUnit = useStoreState((store) => store.settings.fiatUnit);
  const changeFiatUnit = useStoreActions((store) => store.settings.changeFiatUnit);
  const onFiatUnitPress = async () => {
    if (PLATFORM === "android") {
      const { selectedItem } = await DialogAndroid.showPicker(null, null, {
        positiveText: null,
        negativeText: "Cancel",
        type: DialogAndroid.listRadio,
        selectedId: currentFiatUnit,
        items: Object.entries(fiatRates).map(([currency]) => {
          return {
            label: currency, id: currency
          }
        })
      });
      if (selectedItem) {
        changeFiatUnit(selectedItem.id);
      }
    } else {
      navigation.navigate("ChangeFiatUnit", {
        title: "Change fiat unit",
        data: Object.entries(fiatRates).map(([currency]) => ({
          title: currency,
          value: currency as keyof IFiatRates,
        })),
        onPick: async (currency) => await changeFiatUnit(currency as keyof IFiatRates),
        searchEnabled: true,
      });
    }
  }

  // Name
  const name = useStoreState((store) => store.settings.name);
  const changeName = useStoreActions((store) => store.settings.changeName);
  const onNamePress = async () => {
    Alert.prompt(
      "Name",
      "Choose a name that will be used in transactions\n\n" +
      "Your name will be seen in invoices to those who pay you as well as " +
      "people you pay to.",
      [{
        text: "Cancel",
        style: "cancel",
        onPress: () => {},
      }, {
        text: "Set name",
        onPress: async (text) => {
          await changeName(text ?? null);
        },
      }],
      "plain-text",
      name ?? "",
    );
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
    if (!clipboardInvoiceCheckEnabled) {
      const clipboardText = await Clipboard.getString();
      await checkInvoice(clipboardText);
    }
  };

  // Copy App log
  const copyAppLog = async () => {
    try {
      const path = await NativeModules.LndMobileTools.saveLogs();
      toast("Copied app log file to: " + path, 20000, "warning");
    } catch (e) {
      console.error(e);
      toast("Error copying app log file.", undefined, "danger");
    }
  };

  // Copy lnd log
  const copyLndLog = async () => {
    try {
      const filePath = await NativeModules.LndMobileTools.copyLndLog();
      toast("Copied lnd log file to: " + filePath, undefined, "warning");
    } catch (e) {
      console.error(e);
      toast("Error copying lnd log file.", undefined, "danger");
    }
  };

  // Export channels
  const exportChannelsBackup = useStoreActions((store) => store.channel.exportChannelsBackup);
  const onExportChannelsPress = async () => {
    try {
      const response = await exportChannelsBackup();
      if (PLATFORM === "android") {
        toast(`File written:\n ${response}`, 10000, "warning");
      }
    } catch (e) {
      console.log(e);
      toast(e.message, 10000, "danger");
    }
  }

  // Verify channels backup
  const onVerifyChannelsBackupPress = async () => {
    try {
      const res = await DocumentPicker.pickSingle({
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
  };
  const onLongPressScheduledSyncEnabled = async () => {
    toast(
      `Status: ${workInfo}\n`+
      `Last sync attempt: ${formatISO(fromUnixTime(lastScheduledSyncAttempt))}\n` +
      `Last sync: ${formatISO(fromUnixTime(lastScheduledSync))}`,
      0,
      "success",
      "OK",
    )
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

  const iCloudBackupEnabled = useStoreState((store) => store.settings.iCloudBackupEnabled);
  const changeICloudBackupEnabled = useStoreActions((store) => store.settings.changeICloudBackupEnabled);
  const iCloudMakeBackup = useStoreActions((store) => store.iCloudBackup.makeBackup);
  const onToggleICloudBackup = async () => {
      if (!iCloudBackupEnabled) {
        await iCloudMakeBackup();
      }
      await changeICloudBackupEnabled(!iCloudBackupEnabled);
      toast(`iCloud backup ${iCloudBackupEnabled ? "disabled" : "enabled"}`);
  };

  const onDoICloudBackupPress = async () => {
    try {
      await iCloudMakeBackup();
      toast("Backed up channels to iCloud");
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
        if (PLATFORM === "android") {
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
        } else if (PLATFORM === "ios") {
          const r = await ReactNativePermissions.request(ReactNativePermissions.PERMISSIONS.IOS.LOCATION_WHEN_IN_USE);
          if (r !== "granted") {
            console.log("Error: " + r);
          }
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

  // Inbound services list
  const onInboundServiceListPress = async () => {
    const goToSite = async (selectedItem: "LNBIG" | "BITREFILL_THOR") => {
      if (selectedItem === "LNBIG") {
        await Linking.openURL("https://lnbig.com/");
      } else if (selectedItem === "BITREFILL_THOR") {
        await Linking.openURL("https://embed.bitrefill.com/buy/lightning");
      }
    };

    const description = `Choose an incoming channel provider and press Continue.

Your web browser will be opened to the corresponding provider's website, where you will be able to request a channel.

When you're done, you can copy the address code and/or open the link using Blixt Wallet.`

    if (PLATFORM === "android") {
      interface ShowPickerResult {
        selectedItem: {
          id: "LNBIG" | "BITREFILL_THOR";
          label: "LN Big" | "Bitrefill Thor";
        } | undefined;
      }
      const { selectedItem }: ShowPickerResult = await DialogAndroid.showPicker(null, null, {
        title: "Incoming channel provider",
        content: description,
        positiveText: "Continue",
        negativeText: "Cancel",
        type: DialogAndroid.listRadio,
        items: [{
          id: "LNBIG",
          label: "LN Big"
        }, {
          id: "BITREFILL_THOR",
          label: "Bitrefill Thor"
        }],
      });

      if (selectedItem) {
        await goToSite(selectedItem.id);
      }
    } else {
      navigation.navigate("ChannelProvider", {
        title: "Incoming channel provider",
        description,
        data: [{
          title: "LN Big",
          value: "LNBIG",
        }, {
          title: "Bitrefill Thor",
          value: "BITREFILL_THOR",
        }],
        onPick: async (selectedItem) => {
          goToSite(selectedItem as any)
        }
      });
    }
  }

  // Onchain explorer
  const onchainExplorer = useStoreState((store) => store.settings.onchainExplorer);
  const changeOnchainExplorer = useStoreActions((store) => store.settings.changeOnchainExplorer);
  const onChangeOnchainExplorerPress = async () => {
    const setCustomExplorer = async () => {
      const explorer = await Alert.promisePromptCallback(
        "Custom Onchain Explorer",
        "Set a custom onchain explorer (https://domain.com/)",
        undefined,
        onchainExplorer in OnchainExplorer ? undefined : onchainExplorer,
      );

      if (explorer.trim().length !== 0) {
        await changeOnchainExplorer(explorer);
      }
    };

    if (PLATFORM === "android") {
      const { selectedItem } = await DialogAndroid.showPicker(null, null, {
        positiveText: null,
        negativeText: "Cancel",
        type: DialogAndroid.listRadio,
        selectedId: onchainExplorer,
        items: Object.keys(OnchainExplorer).map((currOnchainExplorer) => ({
          id: currOnchainExplorer,
          label: camelCaseToSpace(currOnchainExplorer),
        })).concat(({
          id: "CUSTOM",
          label: "Custom explorer"
        }))
      });

      if (selectedItem) {
        if (selectedItem.id === "CUSTOM") {
          // Custom explorer, let's ask the user for a URL
          await setCustomExplorer();
        } else {
          await changeOnchainExplorer(selectedItem.id);
        }
      }
    } else {
      navigation.navigate("ChangeOnchainExplorer", {
        title: "Change onchain explorer",
        data: Object.keys(OnchainExplorer).map((currOnchainExplorer) => ({
          title: camelCaseToSpace(currOnchainExplorer),
          value: currOnchainExplorer,
        })).concat({
          title: "Custom explorer",
          value: "CUSTOM"
        }),
        onPick: async (onchainExplorer) => {
          if (onchainExplorer === "CUSTOM") {
            // Custom explorer, let's ask the user for a URL
            await setCustomExplorer();
          } else {
            await changeOnchainExplorer(onchainExplorer);
          }
        },
      });
    }
  };

  // Neutrino peers
  const neutrinoPeers = useStoreState((store) => store.settings.neutrinoPeers);
  const changeNeutrinoPeers = useStoreActions((store) => store.settings.changeNeutrinoPeers);
  const writeConfig = useStoreActions((store) => store.writeConfig);
  const restartNeeded = () => {
    const title = "Restart required";
    const message = "Blixt Wallet has to be restarted before the new configuration is applied."
    if (PLATFORM === "android") {
      Alert.alert(
        title,
        message + "\nWould you like to do that now?",
        [{
          style: "cancel",
          text: "No",
        }, {
          style: "default",
          text: "Yes",
          onPress: async () => {
            try {
              await NativeModules.LndMobile.stopLnd();
              await NativeModules.LndMobileTools.killLnd();
            } catch(e) {
              console.log(e);
            }
            NativeModules.LndMobileTools.restartApp();
          }
        }]
      );
    } else {
      Alert.alert(title, message);
    }
  };
  const onSetBitcoinNodePress = async () => {
    Alert.prompt(
      "Set Node",
      "",
      [{
        text: "Cancel",
        style: "cancel",
        onPress: () => {},
      }, {
        text: "Set node",
        onPress: async (text) => {
          if (text === neutrinoPeers[0]) {
            return;
          }

          if (text) {
            await changeNeutrinoPeers([text]);
          } else {
            await changeNeutrinoPeers([]);
          }
          await writeConfig();

          restartNeeded();
        },
      }],
      "plain-text",
      neutrinoPeers[0] ?? "",
    );
  };
  const onSetBitcoinNodeLongPress = async () => {
    Alert.alert(
      "Restore node",
      `Would you like to restore to the default node (${DEFAULT_NEUTRINO_NODE})?`,
      [{
        style: "cancel",
        text: "No",
      }, {
        style: "default",
        text: "Yes",
        onPress: async () => {
          await changeNeutrinoPeers([DEFAULT_NEUTRINO_NODE]);
          await writeConfig();
          restartNeeded();
        },
      }]
    );
  };

  // bitcoind RPC host
  const bitcoindRpcHost = useStoreState((store) => store.settings.bitcoindRpcHost);
  const changeBitcoindRpcHost = useStoreActions((store) => store.settings.changeBitcoindRpcHost);
  const onSetBitcoindRpcHostPress = async () => {
    Alert.prompt(
      "Set bitcoind RPC host",
      "",
      [{
        text: "Cancel",
        style: "cancel",
        onPress: () => {},
      }, {
        text: "Save",
        onPress: async (text) => {
          if (text) {
            await changeBitcoindRpcHost(text);
            await writeConfig();
          }
        },
      }],
      "plain-text",
      bitcoindRpcHost ?? "",
    );
  };

  // bitcoind zmq block
  const bitcoindPubRawBlock = useStoreState((store) => store.settings.bitcoindPubRawBlock);
  const changeBitcoindPubRawBlock = useStoreActions((store) => store.settings.changeBitcoindPubRawBlock);
  const onSetBitcoindPubRawBlockPress = async () => {
    Alert.prompt(
      "Set bitcoind ZMQ Raw block host",
      "",
      [{
        text: "Cancel",
        style: "cancel",
        onPress: () => {},
      }, {
        text: "Save",
        onPress: async (text) => {
          if (text) {
            await changeBitcoindPubRawBlock(text);
            await writeConfig();
          }
        },
      }],
      "plain-text",
      bitcoindPubRawBlock ?? "",
    );
  };

  // bitcoind zmq tx
  const bitcoindPubRawTx = useStoreState((store) => store.settings.bitcoindPubRawTx);
  const changeBitcoindPubRawTx = useStoreActions((store) => store.settings.changeBitcoindPubRawTx);
  const onSetBitcoindPubRawTxPress = async () => {
    Alert.prompt(
      "Set bitcoind ZMQ Raw Tx host",
      "",
      [{
        text: "Cancel",
        style: "cancel",
        onPress: () => {},
      }, {
        text: "Save",
        onPress: async (text) => {
          if (text) {
            await changeBitcoindPubRawTx(text);
            await writeConfig();
          }
        },
      }],
      "plain-text",
      bitcoindPubRawTx ?? "",
    );
  };

  // Multi-path payments
  const multiPathPaymentsEnabled = useStoreState((store) => store.settings.multiPathPaymentsEnabled);
  const changeMultiPathPaymentsEnabled = useStoreActions((store) => store.settings.changeMultiPathPaymentsEnabled);
  const onChangeMultiPartPaymentEnabledPress = async () => {
    await changeMultiPathPaymentsEnabled(!multiPathPaymentsEnabled);
  };

  const torEnabled = useStoreState((store) => store.settings.torEnabled);
  const changeTorEnabled = useStoreActions((store) => store.settings.changeTorEnabled);
  const onChangeTorEnabled = async () => {
    const text = !torEnabled ?
`Enabling Tor will make the wallet connect to its peers (both Bitcoin and Lightning Network peers) via the Tor Network.

You'll also be able to connect and open channels to Lightning nodes that uses onion services.

WARNING: Blixt Wallet will still talk to the following services without Tor:

https://blockchain.info/ticker
Reason: To get fiat/bitcoin rates

https://mempool.space/api/blocks/tip/height
Reason: To get the current block height

https://www.googleapis.com/drive/v3/files
https://www.googleapis.com/upload/drive/v3/files
Reason: For Google Drive backup

https://nodes.lightning.computer/availability/v1/btc.json
Reason: For reliable Lightning nodes

WebLN Browser and LNURL will also not use Tor.

Do you wish to proceed?`
:
`Disabling Tor requires an app restart.
Do you wish to proceed?`;

    Alert.alert(
      "Tor",
      text,
      [{ text: "No" },
      {
        text: "Yes",
        onPress: async () => {
          await changeTorEnabled(!torEnabled);
          if (PLATFORM === "android") {
            try {
              await NativeModules.LndMobile.stopLnd();
              await NativeModules.LndMobileTools.killLnd();
            } catch(e) {
              console.log(e);
            }
            NativeModules.LndMobileTools.restartApp();
          } else {
            Alert.alert(
              "Restart required",
              "Blixt Wallet has to be restarted before the new configuration is applied."
            );
          }
        },
      }
    ]);
  };

  const hideExpiredInvoices = useStoreState((store) => store.settings.hideExpiredInvoices);
  const changeHideExpiredInvoices = useStoreActions((store) => store.settings.changeHideExpiredInvoices);
  const onToggleHideExpiredInvoicesPress = async () => {
    await changeHideExpiredInvoices(!hideExpiredInvoices);
  }

  const onShowOnionAddressPress = async () => {
    navigation.navigate("TorShowOnionAddress");
  }

  const screenTransitionsEnabled = useStoreState((store) => store.settings.screenTransitionsEnabled);
  const changeScreenTransitionsEnabled = useStoreActions((store) => store.settings.changeScreenTransitionsEnabled);
  const onToggleScreenTransitionsEnabledPress = async () => {
    await changeScreenTransitionsEnabled(!screenTransitionsEnabled);
  }

  const signMessage = useStoreActions((store) => store.lightning.signMessage);
  const onPressSignMesseage = async () => {
    Alert.prompt(
      "Sign message",
      undefined,
      async (text) => {
        if (text.length === 0) {
          return;
        }
        const signMessageResponse = await signMessage(text);

        Alert.alert(
          "Signature",
          signMessageResponse.signature,
          [{
            text: "OK",
          }, {
            text: "Copy",
            onPress: async () => {
              Clipboard.setString(signMessageResponse.signature);
              toast("Copied to clipboard", undefined, "warning");
            }
          }]
        );
      },
      "plain-text",
    );
  }

  // Dunder server
  const dunderServer = useStoreState((store) => store.settings.dunderServer);
  const changeDunderServer = useStoreActions((store) => store.settings.changeDunderServer);

  const onSetDunderServerPress = async () => {
    Alert.prompt(
      "Set Dunder Server",
      "",
      [{
        text: "Cancel",
        style: "cancel",
        onPress: () => {},
      }, {
        text: "Set server",
        onPress: async (text) => {
          if (text === dunderServer) {
            return;
          }

          await changeDunderServer(text ?? "");
        },
      }],
      "plain-text",
      dunderServer ?? "",
    );
  };
  const onSetDunderServerLongPress = async () => {
    Alert.alert(
      "Restore Dunder Server",
      `Would you like to restore to the default Dunder server (${DEFAULT_DUNDER_SERVER})?`,
      [{
        style: "cancel",
        text: "No",
      }, {
        style: "default",
        text: "Yes",
        onPress: async () => {
          await changeDunderServer(DEFAULT_DUNDER_SERVER);
        },
      }]
    );
  };

  // Enable Dunder LSP
  const dunderEnabled = useStoreState((store) => store.settings.dunderEnabled);
  const changeDunderEnabled = useStoreActions((store) => store.settings.changeDunderEnabled);
  const onToggleDunderEnabled = async () => {
    await changeDunderEnabled(!dunderEnabled);
  };

  // Require graph sync before paying
  const requireGraphSync = useStoreState((store) => store.settings.requireGraphSync);
  const changeRequireGraphSync = useStoreActions((store) => store.settings.changeRequireGraphSync);
  const onToggleRequireGraphSyncPress = async () => {
    await changeRequireGraphSync(!requireGraphSync);
  };

  const onLndMobileHelpCenterPress = async () => {
    navigation.navigate("LndMobileHelpCenter");
  }

  const onGetNodeInfoPress = async () => {
    Alert.prompt(
      "Get node info",
      "Enter Node ID",
      [{
        text: "Cancel",
        style: "cancel",
        onPress: () => {},
      }, {
        text: "Get info",
        onPress: async (text) => {
          if (text === "") {
            return;
          }
          try {
            const nodeInfo = await getNodeInfo((text ?? "").split("@")[0], true);
            Alert.alert("", JSON.stringify(nodeInfo.toJSON(), null, 2));
          } catch (e) {
            Alert.alert(e.message);
          }
        },
      }],
      "plain-text",
    );
  };

  // Lnd Graph Cache
  const lndNoGraphCache = useStoreState((store) => store.settings.lndNoGraphCache);
  const changeLndNoGraphCache = useStoreActions((store) => store.settings.changeLndNoGraphCache);
  const onToggleLndNoGraphCache = async () => {
    await changeLndNoGraphCache(!lndNoGraphCache);
  };

  // Setup demo environment
  const setupDemo = useStoreActions((store) => store.setupDemo);

  return (
    <Container>
      <Content style={{ padding: 10 }}>
        <BlixtWallet />

        <List style={style.list}>
          <ListItem style={style.itemHeader} itemHeader={true} first={true}>
            <Text>General</Text>
          </ListItem>

          <ListItem style={style.listItem} icon={true} onPress={onNamePress}>
            <Left><Icon style={style.icon} type="AntDesign" name="edit" /></Left>
            <Body>
              <Text>Name</Text>
              <Text note={true}>
                {name || "Will be used in transactions"}
              </Text>
            </Body>
          </ListItem>
          <ListItem style={style.listItem} button={true} icon={true} onPress={onTogglePushNotificationsPress}>
            <Left><Icon style={style.icon} type="Entypo" name="bell" /></Left>
            <Body>
              <Text>Push notifications</Text>
              <Text note={true}>For transaction and channel events</Text>
            </Body>
            <Right><CheckBox checked={pushNotificationsEnabled} onPress={onTogglePushNotificationsPress} /></Right>
          </ListItem>
          <ListItem style={style.listItem} icon={true} onPress={onToggleClipBoardInvoiceCheck}>
            <Left><Icon style={style.icon} type="Entypo" name="clipboard" /></Left>
            <Body>
              <Text>Check clipboard for invoices</Text>
              <Text note={true}>Automatically check clipboard for invoices</Text>
            </Body>
            <Right><CheckBox checked={clipboardInvoiceCheckEnabled} onPress={onToggleClipBoardInvoiceCheck} /></Right>
          </ListItem>
          <ListItem style={style.listItem} icon={true} onPress={onToggleTransactionGeolocationEnabled}>
            <Left><Icon style={style.icon} type="Entypo" name="location-pin" /></Left>
            <Body>
              <Text>Save geolocation of transaction</Text>
              <Text note={true}>Locally save the location of a transaction</Text>
            </Body>
            <Right><CheckBox checked={transactionGeolocationEnabled} onPress={onToggleTransactionGeolocationEnabled} /></Right>
          </ListItem>
          {transactionGeolocationEnabled && PLATFORM === "android" &&
            <ListItem style={style.listItem} icon={true} onPress={onChangeMapStylePress}>
              <Left><Icon style={style.icon} type="MaterialCommunityIcons" name="google-maps" /></Left>
              <Body>
                <Text>Set Map theme</Text>
                <Text note={true}>{camelCaseToSpace(transactionGeolocationMapStyle)}</Text>
              </Body>
            </ListItem>
          }


          <ListItem style={style.itemHeader} itemHeader={true} first={true}>
            <Text>Wallet</Text>
          </ListItem>

          {seedAvailable &&
            <>
              <ListItem style={style.listItem} button={true} icon={true} onPress={onGetSeedPress}>
                <Left><Icon style={style.icon} type="AntDesign" name="form" /></Left>
                <Body>
                  <Text>Show mnemonic</Text>
                  <Text note={true}>Show 24-word seed for this wallet</Text>
                </Body>
              </ListItem>
              {onboardingState === "DONE" &&
                <ListItem style={style.listItem} button={true} icon={true} onPress={onRemoveSeedPress}>
                  <Left><Icon style={style.icon} type="Entypo" name="eraser" /></Left>
                  <Body>
                    <Text>Remove mnemonic from device</Text>
                    <Text note={true}>Permanently remove the seed from this device</Text>
                  </Body>
                </ListItem>
              }
            </>
          }
          {["android", "ios"].includes(PLATFORM) &&
            <ListItem style={style.listItem} icon={true} onPress={onExportChannelsPress}>
              <Left><Icon style={style.icon} type="MaterialIcons" name="save" /></Left>
              <Body>
                <Text>Export channel backup</Text>
              </Body>
            </ListItem>
          }
          {(PLATFORM === "android" && (name === "Hampus" || __DEV__ === true)) &&
            <ListItem style={style.listItem} icon={true} onPress={onVerifyChannelsBackupPress}>
              <Left><Icon style={style.icon} type="MaterialIcons" name="backup" /></Left>
              <Body>
                <Text>Verify channel backup</Text>
              </Body>
            </ListItem>
          }
          {(PLATFORM == "android" && !isRecoverMode) &&
            <ListItem style={style.listItem} icon={true} onPress={onToggleGoogleDriveBackup}>
              <Left><Icon style={style.icon} type="MaterialCommunityIcons" name="google-drive" /></Left>
              <Body>
                <Text>Google Drive channel backup</Text>
                <Text note={true}>Automatically backup channels to Google Drive</Text>
              </Body>
              <Right><CheckBox checked={googleDriveBackupEnabled} onPress={onToggleGoogleDriveBackup} /></Right>
            </ListItem>
          }
          {(googleDriveBackupEnabled && !isRecoverMode) &&
            <ListItem style={style.listItem} icon={true} onPress={onDoGoogleDriveBackupPress}>
              <Left><Icon style={style.icon} type="MaterialCommunityIcons" name="folder-google-drive" /></Left>
              <Body><Text>Manually trigger Google Drive Backup</Text></Body>
            </ListItem>
          }
          {(PLATFORM == "ios" && !isRecoverMode) &&
            <ListItem style={style.listItem} icon={true} onPress={onToggleICloudBackup}>
              <Left><Icon style={style.icon} type="MaterialCommunityIcons" name="apple-icloud" /></Left>
              <Body>
                <Text>iCloud channel backup</Text>
                <Text note={true}>Automatically backup channels to iCloud</Text>
              </Body>
              <Right><CheckBox checked={iCloudBackupEnabled} onPress={onToggleICloudBackup} /></Right>
            </ListItem>
          }
          {(iCloudBackupEnabled && !isRecoverMode) &&
            <ListItem style={style.listItem} icon={true} onPress={onDoICloudBackupPress}>
              <Left><Icon style={style.icon} type="MaterialCommunityIcons" name="folder" /></Left>
              <Body><Text>Manually trigger iCloud Backup</Text></Body>
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
              <Left>
                {biometricsSensor !== "Face ID" &&
                  <Icon style={style.icon} type="Entypo" name="fingerprint" />
                }
                {biometricsSensor === "Face ID" &&
                  <Icon style={style.icon} type="MaterialCommunityIcons" name="face-recognition" />
                }
              </Left>
              <Body>
                <Text>
                  Login with{" "}
                  {biometricsSensor === "Biometrics" && "fingerprint"}
                  {biometricsSensor === "Face ID" && "Face ID"}
                  {biometricsSensor === "Touch ID" && "Touch ID"}
                </Text>
              </Body>
              <Right><CheckBox checked={fingerPrintEnabled} onPress={onToggleFingerprintPress}/></Right>
            </ListItem>
          }
          {PLATFORM === "android" &&
            <ListItem style={style.listItem} icon={true} onPress={onToggleScheduledSyncEnabled} onLongPress={onLongPressScheduledSyncEnabled}>
              <Left><Icon style={style.icon} type="MaterialCommunityIcons" name="sync-alert" /></Left>
              <Body>
                <Text>Scheduled chain sync</Text>
                <Text note={true}>
                  Runs in background every 4 hours
                </Text>
              </Body>
              <Right><CheckBox checked={scheduledSyncEnabled} onPress={onToggleScheduledSyncEnabled} /></Right>
            </ListItem>
          }


          <ListItem style={style.itemHeader} itemHeader={true}>
            <Text>Display</Text>
          </ListItem>

          <ListItem style={style.listItem} icon={true} onPress={onFiatUnitPress}>
            <Left><Icon style={style.icon} type="FontAwesome" name="money" /></Left>
            <Body>
              <Text>Fiat currency</Text>
              <Text note={true}  onPress={onFiatUnitPress}>{currentFiatUnit}</Text>
            </Body>
          </ListItem>
          <ListItem style={style.listItem} icon={true} onPress={onBitcoinUnitPress}>
            <Left><Icon style={style.icon} type="FontAwesome5" name="btc" /></Left>
            <Body>
              <Text>Bitcoin unit</Text>
              <Text note={true}  onPress={onBitcoinUnitPress}>{BitcoinUnits[currentBitcoinUnit].settings}</Text>
            </Body>
          </ListItem>
          <ListItem style={style.listItem} button={true} icon={true} onPress={onChangeOnchainExplorerPress}>
            <Left><Icon style={style.icon} type="FontAwesome" name="chain" /></Left>
            <Body>
              <Text>Onchain explorer</Text>
              <Text note={true}>{onchainExplorer in OnchainExplorer ? camelCaseToSpace(onchainExplorer) : onchainExplorer}</Text>
            </Body>
          </ListItem>


          <ListItem style={style.itemHeader} itemHeader={true}>
            <Text>Bitcoin Network</Text>
          </ListItem>

          {Chain !== "regtest" &&
            <ListItem style={style.listItem} icon={true} onPress={onSetBitcoinNodePress} onLongPress={onSetBitcoinNodeLongPress}>
              <Left><Icon style={style.icon} type="MaterialCommunityIcons" name="router-network" /></Left>
              <Body>
                <Text>Bitcoin Node</Text>
                <Text note={true}>
                  Set Bitcoin node (BIP157) to connect to
                </Text>
              </Body>
            </ListItem>
          }
          {Chain === "regtest" &&
            <>
              <ListItem style={style.listItem} icon={true} onPress={onSetBitcoindRpcHostPress}>
                <Left><Icon style={style.icon} type="MaterialCommunityIcons" name="router-network" /></Left>
                <Body>
                  <Text>Set bitcoind RPC Host</Text>
                </Body>
              </ListItem>
              <ListItem style={style.listItem} icon={true} onPress={onSetBitcoindPubRawBlockPress}>
                <Left><Icon style={style.icon} type="MaterialCommunityIcons" name="router-network" /></Left>
                <Body>
                  <Text>Set bitcoind ZMQ Raw Block Host</Text>
                </Body>
              </ListItem>
              <ListItem style={style.listItem} icon={true} onPress={onSetBitcoindPubRawTxPress}>
                <Left><Icon style={style.icon} type="MaterialCommunityIcons" name="router-network" /></Left>
                <Body>
                  <Text>Set bitcoind ZMQ Raw Tx Host</Text>
                </Body>
              </ListItem>
            </>
          }

          <ListItem style={style.itemHeader} itemHeader={true}>
            <Text>Lightning Network</Text>
          </ListItem>

          <ListItem style={style.listItem} icon={true} onPress={() => navigation.navigate("LightningNodeInfo")}>
            <Left><Icon style={style.icon} type="Feather" name="user" /></Left>
            <Body><Text>Show node data</Text></Body>
          </ListItem>
          <ListItem style={style.listItem} icon={true} onPress={() => navigation.navigate("LightningPeers")}>
            <Left><Icon style={style.icon} type="Feather" name="users" /></Left>
            <Body><Text>Show Lightning peers</Text></Body>
          </ListItem>
          <ListItem style={style.listItem} button={true} icon={true} onPress={onToggleAutopilotPress}>
            <Left><Icon style={style.icon} type="Entypo" name="circular-graph" /></Left>
            <Body><Text>Automatically open channels</Text></Body>
            <Right><CheckBox checked={autopilotEnabled} onPress={onToggleAutopilotPress} /></Right>
          </ListItem>
          <ListItem style={style.listItem} button={true} icon={true} onPress={onInboundServiceListPress}>
            <Left><Icon style={style.icon} type="MaterialCommunityIcons" name="cloud-download" /></Left>
            <Body>
              <Text>Inbound channel services</Text>
              <Text note={true}>Use an inbound channel service for receiving payments</Text>
            </Body>
          </ListItem>
          {dunderEnabled &&
            <ListItem style={style.listItem} button={true} icon={true} onPress={onSetDunderServerPress} onLongPress={onSetDunderServerLongPress}>
              <Left><Icon style={style.icon} type="Entypo" name="slideshare" /></Left>
              <Body>
                <Text>Set Dunder LSP Server</Text>
              </Body>
            </ListItem>
          }
          <ListItem style={style.listItem} button={true} icon={true} onPress={onToggleRequireGraphSyncPress}>
            <Left><Icon style={style.icon} type="MaterialCommunityIcons" name="database-sync" /></Left>
            <Body>
              <Text>Wait for graph sync before paying</Text>
              <Text note={true}>Synchronized graph leads to optimal payment paths</Text>
            </Body>
            <Right><CheckBox checked={requireGraphSync} onPress={onToggleRequireGraphSyncPress} /></Right>
          </ListItem>

          <ListItem style={style.itemHeader} itemHeader={true}>
            <Text>Miscellaneous</Text>
          </ListItem>

          <ListItem style={style.listItem} icon={true} onPress={() => navigation.navigate("About")}>
            <Left><Icon style={style.icon} type="AntDesign" name="info" /></Left>
            <Body><Text>About</Text></Body>
          </ListItem>
          {PLATFORM === "android" &&
            <ListItem style={style.listItem} icon={true} onPress={() => copyAppLog()}>
              <Left><Icon style={style.icon} type="AntDesign" name="copy1" /></Left>
              <Body>
                <Text>Copy app log to local storage</Text>
              </Body>
            </ListItem>
          }
          {(PLATFORM === "android" || PLATFORM === "ios") &&
            <ListItem style={style.listItem} icon={true} onPress={() => copyLndLog()}>
              <Left><Icon style={style.icon} type="AntDesign" name="copy1" /></Left>
              <Body>
                <Text>Copy lnd log to local storage</Text>
              </Body>
            </ListItem>
          }
          {(name === "Hampus" || __DEV__ === true) &&
            <ListItem style={style.listItem} icon={true} onPress={() => navigation.navigate("DEV_CommandsX")}>
              <Left><Icon style={style.icon} type="MaterialIcons" name="developer-mode" /></Left>
              <Body><Text>Go to dev screen</Text></Body>
            </ListItem>
          }
          <ListItem style={style.listItem} button={true} icon={true} onPress={onToggleHideExpiredInvoicesPress}>
            <Left><Icon style={style.icon} type="MaterialCommunityIcons" name="file-hidden" /></Left>
            <Body><Text>Automatically hide expired invoices</Text></Body>
            <Right><CheckBox checked={hideExpiredInvoices} onPress={onToggleHideExpiredInvoicesPress} /></Right>
          </ListItem>
          <ListItem style={style.listItem} button={true} icon={true} onPress={onToggleScreenTransitionsEnabledPress}>
            <Left><Icon style={style.icon} type="Ionicons" name="swap-horizontal" /></Left>
            <Body><Text>Screen transitions</Text></Body>
            <Right><CheckBox checked={screenTransitionsEnabled} onPress={onToggleScreenTransitionsEnabledPress} /></Right>
          </ListItem>
          <ListItem style={style.listItem} icon={true} onPress={onPressSignMesseage}>
            <Left><Icon style={style.icon} type="FontAwesome5" name="file-signature" /></Left>
            <Body><Text>Sign message with wallet key</Text></Body>
          </ListItem>

          <ListItem style={style.itemHeader} itemHeader={true}>
            <Text>Experiments</Text>
          </ListItem>
          <ListItem style={style.listItem} icon={true} onPress={onToggleDunderEnabled}>
            <Left><Icon style={style.icon} type="Entypo" name="slideshare" /></Left>
            <Body>
              <Text>Enable Dunder LSP</Text>
              <Text note={true}>HIGHLY EXPERIMENTAL. Lightning Service Provider that helps with inbound liquidity.</Text>
            </Body>
            <Right><CheckBox checked={dunderEnabled} onPress={onToggleDunderEnabled} /></Right>
          </ListItem>
          <ListItem style={style.listItem} icon={true} onPress={onChangeMultiPartPaymentEnabledPress}>
            <Left><Icon style={style.icon} type="MaterialCommunityIcons" name="multiplication" /></Left>
            <Body>
              <Text>Enable Multi-Path Payments</Text>
              <Text note={true}>Payments can take up to 2 paths</Text>
            </Body>
            <Right><CheckBox checked={multiPathPaymentsEnabled} onPress={onChangeMultiPartPaymentEnabledPress} /></Right>
          </ListItem>
          {["android", "ios"].includes(PLATFORM) &&
            <ListItem style={style.listItem} icon={true} onPress={onChangeTorEnabled}>
              <Left>
                <TorSvg />
              </Left>
              <Body>
                <Text>Enable Tor</Text>
              </Body>
              <Right><CheckBox checked={torEnabled} onPress={onChangeTorEnabled} /></Right>
            </ListItem>
          }
          {(torEnabled && PLATFORM === "android") &&
            <ListItem style={style.listItem} button={true} icon={true} onPress={onShowOnionAddressPress}>
              <Left><Icon style={[style.icon, { marginLeft: 1, marginRight: -1}]} type="AntDesign" name="qrcode" /></Left>
              <Body>
                <Text>Show Tor onion service</Text>
                <Text note={true}>For connecting and opening channels to this wallet</Text>
              </Body>
            </ListItem>
          }
          <ListItem style={style.listItem} icon={true} onPress={() => navigation.navigate("KeysendExperiment")}>
            <Left><Icon style={style.icon} type="Feather" name="send" /></Left>
            <Body><Text>Keysend Experiment</Text></Body>
          </ListItem>

          <ListItem style={style.itemHeader} itemHeader={true}>
            <Text>Debug</Text>
          </ListItem>
          <ListItem style={style.listItem} button={true} icon={true} onPress={onToggleDebugShowStartupInfo}>
            <Left><Icon style={style.icon} type="MaterialCommunityIcons" name="android-debug-bridge" /></Left>
            <Body><Text>Show startup info notifications</Text></Body>
            <Right><CheckBox checked={debugShowStartupInfo} onPress={onToggleDebugShowStartupInfo} /></Right>
          </ListItem>
          <ListItem style={style.listItem} button={true} icon={true} onPress={onLndMobileHelpCenterPress}>
            <Left><Icon style={[style.icon, { marginLeft: 1, marginRight: -1}]} type="Entypo" name="lifebuoy" /></Left>
            <Body>
              <Text>LndMobile help center</Text>
            </Body>
          </ListItem>
          <ListItem style={style.listItem} button={true} icon={true} onPress={onGetNodeInfoPress}>
            <Left><Icon style={[style.icon, { marginLeft: 1, marginRight: -1}]} type="Entypo" name="info" /></Left>
            <Body>
              <Text>Get node info</Text>
            </Body>
          </ListItem>
          {dunderEnabled &&
            <ListItem style={style.listItem} button={true} icon={true} onPress={() => navigation.navigate("DunderDoctor")}>
              <Left><Icon style={style.icon} type="Entypo" name="slideshare" /></Left>
              <Body>
                <Text>Diagnose Dunder problems</Text>
              </Body>
            </ListItem>
          }
          <ListItem style={style.listItem} icon={true} onPress={async () => {
            navigation.navigate("LndLog");
          }}>
            <Left><Icon style={style.icon} type="Ionicons" name="newspaper-outline" /></Left>
            <Body><Text>Read lnd log</Text></Body>
          </ListItem>

          {((name === "Hampus" || __DEV__ === true)) &&
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
              <ListItem style={style.listItem} icon={true} onPress={() => {
                writeConfig();
                toast("Written")
              }}>
                <Left><Icon style={style.icon} type="MaterialCommunityIcons" name="typewriter" /></Left>
                <Body><Text>Write config</Text></Body>
              </ListItem>
            </>
          }
          <ListItem style={style.listItem} button={true} icon={true} onPress={() => setupDemo({ changeDb: false })}>
            <Left><Icon style={[style.icon, { marginLeft: 1, marginRight: -1 }]} type="AntDesign" name="mobile1" /></Left>
            <Body>
              <Text>Activate Demo Mode</Text>
              <Text note={true}>Used for promo. Restart app to reset</Text>
            </Body>
          </ListItem>
          <ListItem style={style.listItem} button={true} icon={true} onPress={onToggleLndNoGraphCache}>
            <Left><Icon style={style.icon} type="MaterialCommunityIcons" name="database-sync" /></Left>
            <Body>
              <Text>Disable lnd graph cache</Text>
            </Body>
            <Right><CheckBox checked={lndNoGraphCache} onPress={onToggleLndNoGraphCache} /></Right>
          </ListItem>
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
    paddingLeft: 2,
    paddingRight: 2,
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
    borderBottomWidth: 0,
  },
  icon: {
    fontSize: 22,
    ...Platform.select({
      web: {
        marginRight: 5,
      }
    }),
  },
});

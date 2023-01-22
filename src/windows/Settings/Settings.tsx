import React, { useLayoutEffect } from "react";
import { StyleSheet, NativeModules, PermissionsAndroid, Linking, Platform } from "react-native";
import Clipboard from "@react-native-community/clipboard";
import DocumentPicker from "react-native-document-picker";
import { readFile } from "react-native-fs";
import { CheckBox, Body, Container, Icon, Text, Left, List, ListItem, Right } from "native-base";
import DialogAndroid from "react-native-dialogs";
import { fromUnixTime } from "date-fns";
import { StackNavigationProp } from "@react-navigation/stack";

import { SettingsStackParamList } from "./index";
import Content from "../../components/Content";
import { useStoreActions, useStoreState } from "../../state/store";
import { LoginMethods } from "../../state/Security";
import { BitcoinUnits, IBitcoinUnits } from "../../utils/bitcoin-units";
import { getChanInfo, verifyChanBackup } from "../../lndmobile/channel";
import { camelCaseToSpace, formatISO, toast } from "../../utils";
import { MapStyle } from "../../utils/google-maps";
import { OnchainExplorer } from "../../state/Settings";
import TorSvg from "./TorSvg";
import { DEFAULT_DUNDER_SERVER, DEFAULT_INVOICE_EXPIRY, DEFAULT_NEUTRINO_NODE, PLATFORM } from "../../utils/constants";
import { IFiatRates } from "../../state/Fiat";
import BlixtWallet from "../../components/BlixtWallet";
import { Alert } from "../../utils/alert";
import { getNodeInfo, resetMissionControl } from "../../lndmobile";

import { useTranslation } from "react-i18next";
import { languages, namespaces } from "../../i18n/i18n.constants";
import Long from "long";

let ReactNativePermissions: any;
if (PLATFORM !== "macos") {
  ReactNativePermissions = require("react-native-permissions");
}

interface ISettingsProps {
  navigation: StackNavigationProp<SettingsStackParamList, "Settings">;
}
export default function Settings({ navigation }: ISettingsProps) {
  const currentLanguage = useStoreState((store) => store.settings.language);
  const { t, i18n } = useTranslation(namespaces.settings.settings);
  const lndChainBackend = useStoreState((store) => store.settings.lndChainBackend);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerTitle: t("title"),
      headerBackTitle: "Back",
      headerShown: true,
    });
  }, [navigation, currentLanguage]);

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
      Alert.alert(t("wallet.seed.show.dialog.title"), seed.join(" "), [{
        text: t("wallet.seed.show.dialog.copy"),
        onPress: async () => {
          Clipboard.setString(seed.join(" "));
          toast(t("wallet.seed.show.dialog.alert"), undefined, "warning");
        }
      }, {
        text: t("buttons.ok",{ns:namespaces.common}),
      }]);
    }
  }

  const onRemoveSeedPress = async () => {
    Alert.alert(t("wallet.seed.remove.dialog.title"), t("wallet.seed.remove.dialog.msg"), [{
      text: t("buttons.cancel",{ns:namespaces.common}),
    }, {
      text: t("wallet.seed.remove.dialog.accept"),
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
        negativeText: t("buttons.cancel",{ns:namespaces.common}),
        type: DialogAndroid.listRadio,
        selectedId: currentBitcoinUnit,
        items: [
          { label: BitcoinUnits.bitcoin.settings, id: "bitcoin" },
          { label: BitcoinUnits.bit.settings, id: "bit" },
          { label: BitcoinUnits.sat.settings, id: "sat" },
          { label: BitcoinUnits.satoshi.settings, id: "satoshi" },
          { label: BitcoinUnits.milliBitcoin.settings, id: "milliBitcoin" },
        ]
      });
      if (selectedItem) {
        changeBitcoinUnit(selectedItem.id);
      }
    } else {
      navigation.navigate("ChangeBitcoinUnit", {
        title: t("display.bitcoinUnit.title"),
        data: [
          { title: BitcoinUnits.bitcoin.settings, value: "bitcoin" },
          { title: BitcoinUnits.bit.settings, value: "bit" },
          { title: BitcoinUnits.sat.settings, value: "sat" },
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
        negativeText: t("buttons.cancel",{ns:namespaces.common}),
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
        title: t("display.fiatUnit.title"),
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
      t("general.name.title"),
      t("general.name.dialog.msg"),
      [{
        text: t("buttons.cancel",{ns:namespaces.common}),
        style: "cancel",
        onPress: () => {},
      }, {
        text: t("general.name.dialog.accept"),
        onPress: async (text) => {
          await changeName(text ?? null);
        },
      }],
      "plain-text",
      name ?? "",
    );
  };

  // Language
  const changeLanguage = useStoreActions((store) => store.settings.changeLanguage);

  const onLangPress = async () => {
    if (PLATFORM === "android") {
      const { selectedItem } = await DialogAndroid.showPicker(null, null, {
        positiveText: null,
        negativeText: t("buttons.cancel",{ ns:namespaces.common }),
        type: DialogAndroid.listRadio,
        selectedId: currentLanguage,
        items: Object.keys(languages).sort().map((key) => {
          return {
            label: languages[key].name,
            id: languages[key].id
          }
        })
      });
      if (selectedItem) {
        await changeLanguage(selectedItem.id);
      }
    } else {
      navigation.navigate("ChangeLanguage", {
        title: t("general.lang.dialog.title"),
        data: Object.keys(languages).sort().map((key) => {
          return {
            title: languages[key].name,
            value: languages[key].id
          }
        }),
        onPick: async (lang) => {
          await changeLanguage(lang);
        },
      });
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
    if (!clipboardInvoiceCheckEnabled) {
      const clipboardText = await Clipboard.getString();
      await checkInvoice(clipboardText);
    }
  };

  // Copy App log
  const copyAppLog = async () => {
    try {
      const path = await NativeModules.LndMobileTools.saveLogs();
      toast(`${t("miscelaneous.appLog.dialog.alert")}: `+ path, 20000, "warning");
    } catch (e) {
      console.error(e);
      toast(t("miscelaneous.appLog.dialog.error"), undefined, "danger");
    }
  };

  // Copy lnd log
  const copyLndLog = async () => {
    try {
      await NativeModules.LndMobileTools.copyLndLog();
    } catch (e) {
      console.error(e);
      toast(t("miscelaneous.lndLog.dialog.error"), undefined, "danger");
    }
  };

  // Export channels
  const exportChannelsBackup = useStoreActions((store) => store.channel.exportChannelsBackup);
  const onExportChannelsPress = async () => {
    try {
      const response = await exportChannelsBackup();
    } catch (e) {
      console.log(e);
      toast(e.message, 10000, "danger");
    }
  }
  const exportChannelBackupFile = useStoreActions((store) => store.channel.exportChannelBackupFile);
  const onExportChannelsEmergencyPress = async () => {
    try {
      const response = await exportChannelBackupFile();
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
      const backupFileUri = PLATFORM === "ios" ? res.uri.replace(/%20/g, " ") : res.uri;
      const backupBase64 = await readFile(backupFileUri, PLATFORM === "android" ? "base64" : undefined);
      console.log(backupBase64);
      await verifyChanBackup(backupBase64);
      Alert.alert("Channel backup file is valid");
    } catch (e) {
      console.log(e);
      if (!e.message?.includes?.("document picker")) {
        Alert.alert("Error verifying channel backup", e.message);
      }
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
      Alert.alert(t("security.chainSync.dialog.title"),
                  t("security.chainSync.dialog.msg"),
      [{
        text: t("buttons.cancel", { ns:namespaces.common }),
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
      `${t("msg.status",{ns:namespaces.common})}: ${workInfo}\n`+
      `${t("msg.lastSyncAttempt",{ns:namespaces.common})}: ${formatISO(fromUnixTime(lastScheduledSyncAttempt))}\n` +
      `${t("msg.lastSync",{ns:namespaces.common})}: ${formatISO(fromUnixTime(lastScheduledSync))}`,
      0,
      "success",
      t("buttons.ok",{ns:namespaces.common}),
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
      toast(t("wallet.backup.googleCloud.alert"));
    }
    else {
      await googleSignOut();
      await changeGoogleDriveBackupEnabled(false);
    }
  };

  const onDoGoogleDriveBackupPress = async () => {
    try {
      await googleDriveMakeBackup();
      toast(t("wallet.backup.googleCloudForce.alert"));
    }
    catch (e) {
      toast(t("wallet.backup.error")+`: ${e.message}`, 10000, "danger");
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
      toast(`${t("wallet.backup.iCloud.alert")} ${iCloudBackupEnabled ? "disabled" : "enabled"}`);
  };

  const onDoICloudBackupPress = async () => {
    try {
      await iCloudMakeBackup();
      toast(t("wallet.backup.iCloudForce.alert"));
    }
    catch (e) {
      toast(t("wallet.backup.error")+`: ${e.message}`, 10000, "danger");
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
            console.log(t("general.saveGeolocation.logGranted"));
          } else {
            console.log(t("general.saveGeolocation.logDenied"));
            return;
          }
        } else if (PLATFORM === "ios") {
          const r = await ReactNativePermissions.request(ReactNativePermissions.PERMISSIONS.IOS.LOCATION_WHEN_IN_USE);
          if (r !== "granted") {
            console.log(t("msg.error",{ns:namespaces.common})+": " + r);
          }
        }
      } catch (err:any) {
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
      negativeText: t("buttons.cancel", { ns:namespaces.common }),
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

    const description = `${t("LN.inbound.dialog.msg1")}

${t("LN.inbound.dialog.msg2")}

${t("LN.inbound.dialog.msg3")}`

    if (PLATFORM === "android") {
      interface ShowPickerResult {
        selectedItem: {
          id: "LNBIG" | "BITREFILL_THOR";
          label: "LN Big" | "Bitrefill Thor";
        } | undefined;
      }
      const { selectedItem }: ShowPickerResult = await DialogAndroid.showPicker(null, null, {
        title: t("LN.inbound.dialog.title"),
        content: description,
        positiveText: t("buttons.continue", { ns:namespaces.common }),
        negativeText: t("buttons.cancel", { ns:namespaces.common }),
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
        title: t("LN.inbound.dialog.title"),
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
        negativeText: t("buttons.cancel",{ns:namespaces.common}),
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
        title: t("display.onchainExplorer.dialog.title"),
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
    const title = t("bitcoinNetwork.restartDialog.title");
    const message = t("bitcoinNetwork.restartDialog.msg");
    if (PLATFORM === "android") {
      Alert.alert(
        title,
        message + "\n" + t("bitcoinNetwork.restartDialog.msg1"),
        [{
          style: "cancel",
          text: t("buttons.no",{ns:namespaces.common}),
        }, {
          style: "default",
          text: t("buttons.yes",{ns:namespaces.common}),
          onPress: async () => {
            try {
              await NativeModules.BlixtTor.stopTor();
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
      t("bitcoinNetwork.node.setDialog.title"),
      t("bitcoinNetwork.node.setDialog.info") + "\n\n" +
      t("bitcoinNetwork.node.setDialog.leaveBlankToSearch") + "\n\n" +
      t("bitcoinNetwork.node.setDialog.longPressToReset", { defaultNode: DEFAULT_NEUTRINO_NODE }),
      [{
        text: t("buttons.cancel",{ns:namespaces.common}),
        style: "cancel",
        onPress: () => {},
      }, {
        text: t("bitcoinNetwork.node.setDialog.title"),
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
      t("bitcoinNetwork.node.restoreDialog.title"),
      `${t("bitcoinNetwork.node.restoreDialog.msg")} (${DEFAULT_NEUTRINO_NODE})?`,
      [{
        style: "cancel",
        text: t("buttons.no",{ns:namespaces.common}),
      }, {
        style: "default",
        text: t("buttons.yes",{ns:namespaces.common}),
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
      t("bitcoinNetwork.rpc.title"),
      "",
      [{
        text: t("buttons.cancel", { ns:namespaces.common }),
        style: "cancel",
        onPress: () => {},
      }, {
        text: t("buttons.save", { ns:namespaces.common }),
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
      t("bitcoinNetwork.zmqRawBlock.title"),
      "",
      [{
        text: t("buttons.cancel", { ns:namespaces.common }),
        style: "cancel",
        onPress: () => {},
      }, {
        text: t("buttons.save", { ns:namespaces.common }),
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
      t("bitcoinNetwork.zmqRawTx.title"),
      "",
      [{
        text: t("buttons.cancel", { ns:namespaces.common }),
        style: "cancel",
        onPress: () => {},
      }, {
        text: t("buttons.save", { ns:namespaces.common }),
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
`${t("experimental.tor.enabled.msg1")}

${t("experimental.tor.enabled.msg2")}

${t("experimental.tor.enabled.msg3")}:

https://blockchain.info/ticker
${t("experimental.tor.enabled.msg4")}

https://mempool.space/api/blocks/tip/height
${t("experimental.tor.enabled.msg5")}

https://www.googleapis.com/drive/v3/files
https://www.googleapis.com/upload/drive/v3/files
${t("experimental.tor.enabled.msg6")}

https://nodes.lightning.computer/availability/v1/btc.json
${t("experimental.tor.enabled.msg7")}

${t("experimental.tor.enabled.msg8")}`
:
`${t("experimental.tor.disabled.msg1")}
${t("experimental.tor.disabled.msg2")}`;

    Alert.alert(
      "Tor",
      text,
      [{ text: t("buttons.no",{ns:namespaces.common}) },
      {
        text: t("buttons.yes",{ns:namespaces.common}),
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
              t("bitcoinNetwork.restartDialog.title"),
              t("bitcoinNetwork.restartDialog.msg"),
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
      t("miscelaneous.signMessage.dialog1.title"),
      undefined,
      async (text) => {
        if (text.length === 0) {
          return;
        }
        const signMessageResponse = await signMessage(text);

        Alert.alert(
          t("miscelaneous.signMessage.dialog2.title"),
          signMessageResponse.signature,
          [{
            text: t("buttons.ok", { ns:namespaces.common }),
          }, {
            text: t("buttons.copy", { ns:namespaces.common }),
            onPress: async () => {
              Clipboard.setString(signMessageResponse.signature);
              toast(t("miscelaneous.signMessage.dialog2.alert"), undefined, "warning");
            }
          }]
        );
      },
      "plain-text",
    );
  }

  // Delete wallet
  const onPressDeleteWallet = async () => {
    Alert.prompt(
      "Delete wallet",
      "WARNING!\nOnly do this if you're know what you're doing.\n" +
      "Any funds that has not been properly backed up will be lost forever.\n\n" +
      "Write \"delete wallet\" and press OK to continue.\n" +
      "Once the wallet has been deleted, the app will be restarted " +
      "for you to create restore or create a new wallet",
      async (text) => {
        if (text.length === 0 || text !== "delete wallet") {
          return;
        }

        if (text === "delete wallet") {
          // await NativeModules.LndMobile.stopLnd();
          // await timeout(1000);
          // await NativeModules.LndMobileTools.DEBUG_deleteDatafolder();
        }
      },
      "plain-text",
    );
  }

  // Dunder server
  const dunderServer = useStoreState((store) => store.settings.dunderServer);
  const changeDunderServer = useStoreActions((store) => store.settings.changeDunderServer);

  const onSetDunderServerPress = async () => {
    Alert.prompt(
      t("LN.LSP.setDialog.title"),
      "",
      [{
        text: t("buttons.cancel",{ ns:namespaces.common }),
        style: "cancel",
        onPress: () => {},
      }, {
        text: t("LN.LSP.setDialog.acept"),
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
      t("LN.LSP.restoreDialog.title"),
      `${t("LN.LSP.restoreDialog.msg")} (${DEFAULT_DUNDER_SERVER})?`,
      [{
        style: "cancel",
        text: t("buttons.no", { ns:namespaces.common }),
      }, {
        style: "default",
        text: t("buttons.yes", { ns:namespaces.common }),
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

  // Enable Receive by P2TR
  const receiveViaP2TR = useStoreState((store) => store.settings.receiveViaP2TR);
  const changeReceiveViaP2TR = useStoreActions((store) => store.settings.changeReceiveViaP2TR);
  const onToggleReceiveViaP2TR = async () => {
    await changeReceiveViaP2TR(!receiveViaP2TR);
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

  const onGetChanInfoPress = async () => {
    Alert.prompt(
      "Get channel info",
      "Enter Channel ID",
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
            const nodeInfo = await getChanInfo(Long.fromValue(text ?? ""));
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

  // Invoice expiry
  const invoiceExpiry = useStoreState((store) => store.settings.invoiceExpiry);
  const changeInvoiceExpiry = useStoreActions((store) => store.settings.changeInvoiceExpiry);
  const onPressSetInvoiceExpiry = async () => {
    const expiryString = await Alert.promisePromptCallback(
      "Set invoice expiry in seconds",
      "",
      "plain-text",
      invoiceExpiry.toString(),
      "number-pad"
    );

    try {
      const expiryNumber = Number.parseInt(expiryString, 10);
      await changeInvoiceExpiry(expiryNumber);
    } catch (e) {
      Alert.alert("", "Could not update expiry.\n"+ e.message);
    }
  }

  const onLongPressSetInvoiceExpiry = async () => {
    Alert.alert(
      "",
      `Would you like to restore the invoice expiry to the default value (${DEFAULT_INVOICE_EXPIRY} seconds)?`,
      [{
        style: "cancel",
        text: "No",
      }, {
        style: "default",
        text: "Yes",
        onPress: async () => {
          await changeInvoiceExpiry(DEFAULT_INVOICE_EXPIRY);
        },
      }]
    );
  };

  // Rescan wallet
  const changeRescanWallet = useStoreActions((store) => store.settings.changeRescanWallet);
  const onPressRescanWallet = async () => {
    await changeRescanWallet(true);
    restartNeeded();
  };
  // Setup demo environment
  const setupDemo = useStoreActions((store) => store.setupDemo);

  // Reset mission control
  const onPressResetMissionControl = async () => {
    try {
      await resetMissionControl();
      toast("Done");
    } catch (error) {
      toast(t("msg.error", { ns:namespaces.common }) + ": " + error.message, 0, "danger", "OK");
    }
  };

  // Strict Graph Pruning
  const strictGraphPruningEnabled = useStoreState((store) => store.settings.strictGraphPruningEnabled);
  const changeStrictGraphPruningEnabled = useStoreActions((store) => store.settings.changeStrictGraphPruningEnabled);
  const changeStrictGraphPruningEnabledPress = async () => {
    await changeStrictGraphPruningEnabled(!strictGraphPruningEnabled);
    await writeConfig();
    toast(t("msg.written", { ns:namespaces.common }));
  };

  // Persistent services
  const persistentServicesEnabled = useStoreState((store) => store.settings.persistentServicesEnabled);
  const changePersistentServicesEnabled = useStoreActions((store) => store.settings.changePersistentServicesEnabled);
  const changePersistentServicesEnabledPress = async () => {
    await changePersistentServicesEnabled(!persistentServicesEnabled);
    restartNeeded();
  };

  return (
    <Container>
      <Content style={{ padding: 10 }}>
        <BlixtWallet />

        <List style={style.list}>
          <ListItem style={style.itemHeader} itemHeader={true} first={true}>
            <Text>{t("general.title")}</Text>
          </ListItem>

          <ListItem style={style.listItem} icon={true} onPress={onNamePress}>
            <Left><Icon style={style.icon} type="AntDesign" name="edit" /></Left>
            <Body>
              <Text>{t("general.name.title")}</Text>
              <Text note={true}>
                {name || t("general.name.subtitle")}
              </Text>
            </Body>
          </ListItem>
          <ListItem style={style.listItem} icon={true} onPress={onLangPress}>
            <Left><Icon style={style.icon} type="Entypo" name="language" /></Left>
            <Body>
              <Text>{t("general.lang.title")}</Text>
              <Text note={true}>
                {languages[i18n.language].name}
              </Text>
            </Body>
          </ListItem>
          <ListItem style={style.listItem} button={true} icon={true} onPress={onTogglePushNotificationsPress}>
            <Left><Icon style={style.icon} type="Entypo" name="bell" /></Left>
            <Body>
              <Text>{t("general.pushNotification.title")}</Text>
              <Text note={true}>{t("general.pushNotification.subtitle")}</Text>
            </Body>
            <Right><CheckBox checked={pushNotificationsEnabled} onPress={onTogglePushNotificationsPress} /></Right>
          </ListItem>
          <ListItem style={style.listItem} icon={true} onPress={onToggleClipBoardInvoiceCheck}>
            <Left><Icon style={style.icon} type="Entypo" name="clipboard" /></Left>
            <Body>
              <Text>{t("general.checkClipboard.title")}</Text>
              <Text note={true}>{t("general.checkClipboard.subtitle")}</Text>
            </Body>
            <Right><CheckBox checked={clipboardInvoiceCheckEnabled} onPress={onToggleClipBoardInvoiceCheck} /></Right>
          </ListItem>
          {["android", "ios"].includes(PLATFORM) &&
            <ListItem style={style.listItem} icon={true} onPress={onToggleTransactionGeolocationEnabled}>
              <Left><Icon style={style.icon} type="Entypo" name="location-pin" /></Left>
              <Body>
                <Text>{t("general.saveGeolocation.title")}</Text>
                <Text note={true}>{t("general.saveGeolocation.subtitle")}</Text>
              </Body>
              <Right><CheckBox checked={transactionGeolocationEnabled} onPress={onToggleTransactionGeolocationEnabled} /></Right>
            </ListItem>
          }
          {transactionGeolocationEnabled && PLATFORM === "android" &&
            <ListItem style={style.listItem} icon={true} onPress={onChangeMapStylePress}>
              <Left><Icon style={style.icon} type="MaterialCommunityIcons" name="google-maps" /></Left>
              <Body>
                <Text>{t("general.mapTheme.title")}</Text>
                <Text note={true}>{camelCaseToSpace(transactionGeolocationMapStyle)}</Text>
              </Body>
            </ListItem>
          }


          <ListItem style={style.itemHeader} itemHeader={true} first={true}>
            <Text>{t("wallet.title")}</Text>
          </ListItem>

          {seedAvailable &&
            <>
              <ListItem style={style.listItem} button={true} icon={true} onPress={onGetSeedPress}>
                <Left><Icon style={style.icon} type="AntDesign" name="form" /></Left>
                <Body>
                  <Text>{t("wallet.seed.show.title")}</Text>
                  <Text note={true}>{t("wallet.seed.show.subtitle")}</Text>
                </Body>
              </ListItem>
              {onboardingState === "DONE" &&
                <ListItem style={style.listItem} button={true} icon={true} onPress={onRemoveSeedPress}>
                  <Left><Icon style={style.icon} type="Entypo" name="eraser" /></Left>
                  <Body>
                    <Text>{t("wallet.seed.remove.title")}</Text>
                    <Text note={true}>{t("wallet.seed.remove.subtitle")}</Text>
                  </Body>
                </ListItem>
              }
            </>
          }
          {["android", "ios", "macos"].includes(PLATFORM) &&
            <ListItem style={style.listItem} icon={true} onPress={onExportChannelsPress} onLongPress={onExportChannelsEmergencyPress}>
              <Left><Icon style={style.icon} type="MaterialIcons" name="save" /></Left>
              <Body>
                <Text>{t("wallet.backup.export.title")}</Text>
              </Body>
            </ListItem>
          }
          {["android", "ios"].includes(PLATFORM) &&
            <ListItem style={style.listItem} icon={true} onPress={onVerifyChannelsBackupPress}>
              <Left><Icon style={style.icon} type="MaterialIcons" name="backup" /></Left>
              <Body>
                <Text>{t("wallet.backup.verify.title")}</Text>
              </Body>
            </ListItem>
          }
          {(PLATFORM == "android" && !isRecoverMode) &&
            <ListItem style={style.listItem} icon={true} onPress={onToggleGoogleDriveBackup}>
              <Left><Icon style={style.icon} type="MaterialCommunityIcons" name="google-drive" /></Left>
              <Body>
                <Text>{t("wallet.backup.googleCloud.title")}</Text>
                <Text note={true}>{t("wallet.backup.googleCloud.subtitle")}</Text>
              </Body>
              <Right><CheckBox checked={googleDriveBackupEnabled} onPress={onToggleGoogleDriveBackup} /></Right>
            </ListItem>
          }
          {(googleDriveBackupEnabled && !isRecoverMode) &&
            <ListItem style={style.listItem} icon={true} onPress={onDoGoogleDriveBackupPress}>
              <Left><Icon style={style.icon} type="MaterialCommunityIcons" name="folder-google-drive" /></Left>
              <Body><Text>{t("wallet.backup.googleCloudForce.title")}</Text></Body>
            </ListItem>
          }
          {(PLATFORM == "ios" && !isRecoverMode) &&
            <ListItem style={style.listItem} icon={true} onPress={onToggleICloudBackup}>
              <Left><Icon style={style.icon} type="MaterialCommunityIcons" name="apple-icloud" /></Left>
              <Body>
                <Text>{t("wallet.backup.iCloud.title")}</Text>
                <Text note={true}>{t("wallet.backup.iCloud.subtitle")}</Text>
              </Body>
              <Right><CheckBox checked={iCloudBackupEnabled} onPress={onToggleICloudBackup} /></Right>
            </ListItem>
          }
          {(iCloudBackupEnabled && !isRecoverMode) &&
            <ListItem style={style.listItem} icon={true} onPress={onDoICloudBackupPress}>
              <Left><Icon style={style.icon} type="MaterialCommunityIcons" name="folder" /></Left>
              <Body><Text>{t("wallet.backup.iCloudForce.title")}</Text></Body>
            </ListItem>
          }

          <ListItem style={style.itemHeader} itemHeader={true}>
            <Text>{t("security.title")}</Text>
          </ListItem>

          <ListItem style={style.listItem} button={true} icon={true} onPress={loginMethods!.has(LoginMethods.pincode) ? onRemovePincodePress : onSetPincodePress}>
            <Left><Icon style={style.icon} type="AntDesign" name="lock" /></Left>
            <Body><Text>{t("security.pincode.title")}</Text></Body>
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
                {t("security.biometrics.title")}{" "}
                  {biometricsSensor === "Biometrics" && t("security.biometrics.fingerprint")}
                  {biometricsSensor === "Face ID" && t("security.biometrics.faceId")}
                  {biometricsSensor === "Touch ID" && t("security.biometrics.touchID")}
                </Text>
              </Body>
              <Right><CheckBox checked={fingerPrintEnabled} onPress={onToggleFingerprintPress}/></Right>
            </ListItem>
          }
          {PLATFORM === "android" &&
            <ListItem style={style.listItem} icon={true} onPress={onToggleScheduledSyncEnabled} onLongPress={onLongPressScheduledSyncEnabled}>
              <Left><Icon style={style.icon} type="MaterialCommunityIcons" name="sync-alert" /></Left>
              <Body>
                <Text>{t("security.chainSync.title")}</Text>
                <Text note={true}>
                  {t("security.chainSync.subtitle")}
                </Text>
              </Body>
              <Right><CheckBox checked={scheduledSyncEnabled} onPress={onToggleScheduledSyncEnabled} /></Right>
            </ListItem>
          }


          <ListItem style={style.itemHeader} itemHeader={true}>
            <Text>{t("display.title")}</Text>
          </ListItem>

          <ListItem style={style.listItem} icon={true} onPress={onFiatUnitPress}>
            <Left><Icon style={style.icon} type="FontAwesome" name="money" /></Left>
            <Body>
              <Text>{t("display.fiatUnit.title")}</Text>
              <Text note={true}  onPress={onFiatUnitPress}>{currentFiatUnit}</Text>
            </Body>
          </ListItem>
          <ListItem style={style.listItem} icon={true} onPress={onBitcoinUnitPress}>
            <Left><Icon style={style.icon} type="FontAwesome5" name="btc" /></Left>
            <Body>
              <Text>{t("display.bitcoinUnit.title")}</Text>
              <Text note={true}  onPress={onBitcoinUnitPress}>{BitcoinUnits[currentBitcoinUnit].settings}</Text>
            </Body>
          </ListItem>
          <ListItem style={style.listItem} button={true} icon={true} onPress={onChangeOnchainExplorerPress}>
            <Left><Icon style={style.icon} type="FontAwesome" name="chain" /></Left>
            <Body>
              <Text>{t("display.onchainExplorer.title")}</Text>
              <Text note={true}>{onchainExplorer in OnchainExplorer ? camelCaseToSpace(onchainExplorer) : onchainExplorer}</Text>
            </Body>
          </ListItem>


          <ListItem style={style.itemHeader} itemHeader={true}>
            <Text>{t("bitcoinNetwork.title")}</Text>
          </ListItem>

          {lndChainBackend === "neutrino" &&
            <ListItem style={style.listItem} icon={true} onPress={onSetBitcoinNodePress} onLongPress={onSetBitcoinNodeLongPress}>
              <Left><Icon style={style.icon} type="MaterialCommunityIcons" name="router-network" /></Left>
              <Body>
                <Text>{t("bitcoinNetwork.node.title")}</Text>
                <Text note={true}>{t("bitcoinNetwork.node.subtitle")}</Text>
              </Body>
            </ListItem>
          }
          {lndChainBackend === "bitcoindWithZmq" &&
            <>
              <ListItem style={style.listItem} icon={true} onPress={onSetBitcoindRpcHostPress}>
                <Left><Icon style={style.icon} type="MaterialCommunityIcons" name="router-network" /></Left>
                <Body>
                  <Text>{t("bitcoinNetwork.rpc.title")}</Text>
                </Body>
              </ListItem>
              <ListItem style={style.listItem} icon={true} onPress={onSetBitcoindPubRawBlockPress}>
                <Left><Icon style={style.icon} type="MaterialCommunityIcons" name="router-network" /></Left>
                <Body>
                  <Text>{t("bitcoinNetwork.zmqRawBlock.title")}</Text>
                </Body>
              </ListItem>
              <ListItem style={style.listItem} icon={true} onPress={onSetBitcoindPubRawTxPress}>
                <Left><Icon style={style.icon} type="MaterialCommunityIcons" name="router-network" /></Left>
                <Body>
                  <Text>{t("bitcoinNetwork.zmqRawTx.title")}</Text>
                </Body>
              </ListItem>
            </>
          }
          <ListItem style={style.listItem} icon={true} onPress={onToggleReceiveViaP2TR}>
            <Left><Icon style={style.icon} type="MaterialCommunityIcons" name="carrot" /></Left>
            <Body>
              <Text>{t("bitcoinNetwork.p2tr.title")}</Text>
            </Body>
            <Right><CheckBox checked={receiveViaP2TR} onPress={onToggleReceiveViaP2TR} /></Right>
          </ListItem>

          <ListItem style={style.itemHeader} itemHeader={true}>
            <Text>{t("LN.title")}</Text>
          </ListItem>

          <ListItem style={style.listItem} icon={true} onPress={() => navigation.navigate("LightningNodeInfo")}>
            <Left><Icon style={style.icon} type="Feather" name="user" /></Left>
            <Body><Text>{t("LN.node.title")}</Text></Body>
          </ListItem>
          <ListItem style={style.listItem} icon={true} onPress={() => navigation.navigate("LightningPeers")}>
            <Left><Icon style={style.icon} type="Feather" name="users" /></Left>
            <Body><Text>{t("LN.peers.title")}</Text></Body>
          </ListItem>
          <ListItem style={style.listItem} icon={true} onPress={() => navigation.navigate("LightningNetworkInfo")}>
            <Left><Icon style={style.icon} type="Entypo" name="network" /></Left>
            <Body><Text>{t("LN.network.title")}</Text></Body>
          </ListItem>
          <ListItem style={style.listItem} button={true} icon={true} onPress={onToggleAutopilotPress}>
            <Left><Icon style={style.icon} type="Entypo" name="circular-graph" /></Left>
            <Body><Text>{t("LN.autopilot.title")}</Text></Body>
            <Right><CheckBox checked={autopilotEnabled} onPress={onToggleAutopilotPress} /></Right>
          </ListItem>
          <ListItem style={style.listItem} button={true} icon={true} onPress={onInboundServiceListPress}>
            <Left><Icon style={style.icon} type="MaterialCommunityIcons" name="cloud-download" /></Left>
            <Body>
              <Text>{t("LN.inbound.title")}</Text>
              <Text note={true}>{t("LN.inbound.subtitle")}</Text>
            </Body>
          </ListItem>
          {dunderEnabled &&
            <ListItem style={style.listItem} button={true} icon={true} onPress={onSetDunderServerPress} onLongPress={onSetDunderServerLongPress}>
              <Left><Icon style={style.icon} type="Entypo" name="slideshare" /></Left>
              <Body>
                <Text>{t("LN.LSP.title")}</Text>
              </Body>
            </ListItem>
          }
          <ListItem style={style.listItem} button={true} icon={true} onPress={onToggleRequireGraphSyncPress}>
            <Left><Icon style={style.icon} type="MaterialCommunityIcons" name="database-sync" /></Left>
            <Body>
              <Text>{t("LN.graphSync.title")}</Text>
              <Text note={true}>{t("LN.graphSync.subtitle")}</Text>
            </Body>
            <Right><CheckBox checked={requireGraphSync} onPress={onToggleRequireGraphSyncPress} /></Right>
          </ListItem>

          <ListItem style={style.itemHeader} itemHeader={true}>
            <Text>{t("miscelaneous.title")}</Text>
          </ListItem>

          <ListItem style={style.listItem} icon={true} onPress={() => navigation.navigate("About")}>
            <Left><Icon style={style.icon} type="AntDesign" name="info" /></Left>
            <Body><Text>{t("miscelaneous.about.title")}</Text></Body>
          </ListItem>
          {PLATFORM === "android" &&
            <ListItem style={style.listItem} icon={true} onPress={() => copyAppLog()}>
              <Left><Icon style={style.icon} type="AntDesign" name="copy1" /></Left>
              <Body>
                <Text>{t("miscelaneous.appLog.title")}</Text>
              </Body>
            </ListItem>
          }
          {(PLATFORM === "android" || PLATFORM === "ios" || PLATFORM === "macos") &&
            <ListItem style={style.listItem} icon={true} onPress={() => copyLndLog()}>
              <Left><Icon style={style.icon} type="AntDesign" name="copy1" /></Left>
              <Body>
                <Text>{t("miscelaneous.lndLog.title")}</Text>
              </Body>
            </ListItem>
          }
          <ListItem style={style.listItem} button={true} icon={true} onPress={onToggleHideExpiredInvoicesPress}>
            <Left><Icon style={style.icon} type="MaterialCommunityIcons" name="file-hidden" /></Left>
            <Body><Text>{t("miscelaneous.expiredInvoices.title")}</Text></Body>
            <Right><CheckBox checked={hideExpiredInvoices} onPress={onToggleHideExpiredInvoicesPress} /></Right>
          </ListItem>
          <ListItem style={style.listItem} button={true} icon={true} onPress={onToggleScreenTransitionsEnabledPress}>
            <Left><Icon style={style.icon} type="Ionicons" name="swap-horizontal" /></Left>
            <Body><Text>{t("miscelaneous.screenTransactions.title")}</Text></Body>
            <Right><CheckBox checked={screenTransitionsEnabled} onPress={onToggleScreenTransitionsEnabledPress} /></Right>
          </ListItem>
          <ListItem style={style.listItem} icon={true} onPress={onPressSignMesseage}>
            <Left><Icon style={style.icon} type="FontAwesome5" name="file-signature" /></Left>
            <Body><Text>{t("miscelaneous.signMessage.title")}</Text></Body>
          </ListItem>
          {/* <ListItem style={style.listItem} icon={true} onPress={onPressDeleteWallet}>
            <Left><Icon style={style.icon} type="FontAwesome5" name="file-signature" /></Left>
            <Body><Text>Delete wallet</Text></Body>
          </ListItem> */}

          <ListItem style={style.itemHeader} itemHeader={true}>
            <Text>{t("experimental.title")}</Text>
          </ListItem>
          <ListItem style={style.listItem} icon={true} onPress={onToggleDunderEnabled}>
            <Left><Icon style={style.icon} type="Entypo" name="slideshare" /></Left>
            <Body>
              <Text>{t("experimental.LSP.title")}</Text>
              <Text note={true}>{t("experimental.LSP.subtitle")}</Text>
            </Body>
            <Right><CheckBox checked={dunderEnabled} onPress={onToggleDunderEnabled} /></Right>
          </ListItem>
          {["android", "ios"].includes(PLATFORM) &&
            <ListItem style={style.listItem} icon={true} onPress={onChangeTorEnabled}>
              <Left>
                <TorSvg />
              </Left>
              <Body>
                <Text>{t("experimental.tor.title")}</Text>
              </Body>
              <Right><CheckBox checked={torEnabled} onPress={onChangeTorEnabled} /></Right>
            </ListItem>
          }
          {(torEnabled && PLATFORM === "android") &&
            <ListItem style={style.listItem} button={true} icon={true} onPress={onShowOnionAddressPress}>
              <Left><Icon style={[style.icon, { marginLeft: 1, marginRight: -1}]} type="AntDesign" name="qrcode" /></Left>
              <Body>
                <Text>{t("experimental.onion.title")}</Text>
                <Text note={true}>{t("experimental.onion.subtitle")}</Text>
              </Body>
            </ListItem>
          }
          <ListItem style={style.listItem} icon={true} onPress={onPressSetInvoiceExpiry} onLongPress={onLongPressSetInvoiceExpiry}>
            <Left><Icon style={style.icon} type="MaterialCommunityIcons" name="timer-outline" /></Left>
            <Body>
              <Text>{t("experimental.invoiceExpiry.title")}</Text>
              <Text note={true}>{t("experimental.invoiceExpiry.subtitle", { expiry: invoiceExpiry })}</Text>
            </Body>
          </ListItem>

          <ListItem style={style.itemHeader} itemHeader={true}>
            <Text>{t("debug.title")}</Text>
          </ListItem>
          {(name === "Hampus" || __DEV__ === true) &&
            <ListItem style={style.listItem} icon={true} onPress={() => navigation.navigate("DEV_CommandsX")}>
              <Left><Icon style={style.icon} type="MaterialIcons" name="developer-mode" /></Left>
              <Body><Text>{t("miscelaneous.dev.title")}</Text></Body>
            </ListItem>
          }
          <ListItem style={style.listItem} button={true} icon={true} onPress={onToggleDebugShowStartupInfo}>
            <Left><Icon style={style.icon} type="MaterialCommunityIcons" name="android-debug-bridge" /></Left>
            <Body><Text>{t("debug.startup.title")}</Text></Body>
            <Right><CheckBox checked={debugShowStartupInfo} onPress={onToggleDebugShowStartupInfo} /></Right>
          </ListItem>
          <ListItem style={style.listItem} button={true} icon={true} onPress={onPressRescanWallet}>
            <Left><Icon style={style.icon} type="MaterialCommunityIcons" name="restart" /></Left>
            <Body>
              <Text>{t("debug.rescanWallet.title")}</Text>
              <Text note={true}>{t("debug.rescanWallet.subtitle")}</Text>
            </Body>
          </ListItem>
          <ListItem style={style.listItem} button={true} icon={true} onPress={onLndMobileHelpCenterPress}>
            <Left><Icon style={[style.icon, { marginLeft: 1, marginRight: -1}]} type="Entypo" name="lifebuoy" /></Left>
            <Body>
              <Text>{t("debug.helpCencer.title")}</Text>
            </Body>
          </ListItem>
          <ListItem style={style.listItem} button={true} icon={true} onPress={onGetNodeInfoPress}>
            <Left><Icon style={[style.icon, { marginLeft: 1, marginRight: -1 }]} type="Entypo" name="info" /></Left>
            <Body>
              <Text>{t("debug.getNodeInfo.title")}</Text>
            </Body>
          </ListItem>
          <ListItem style={style.listItem} button={true} icon={true} onPress={onGetChanInfoPress}>
            <Left><Icon style={[style.icon, { marginLeft: 1, marginRight: -1 }]} type="Entypo" name="info" /></Left>
            <Body>
              <Text>{t("debug.getChannelInfo.title")}</Text>
            </Body>
          </ListItem>
          {dunderEnabled &&
            <ListItem style={style.listItem} button={true} icon={true} onPress={() => navigation.navigate("DunderDoctor")}>
              <Left><Icon style={style.icon} type="Entypo" name="slideshare" /></Left>
              <Body>
                <Text>{t("debug.LSP.title")}</Text>
              </Body>
            </ListItem>
          }
          <ListItem style={style.listItem} icon={true} onPress={async () => {
            navigation.navigate("LndLog");
          }}>
            <Left><Icon style={style.icon} type="Ionicons" name="newspaper-outline" /></Left>
            <Body><Text>{t("debug.lndLog.title")}</Text></Body>
          </ListItem>

          {((name === "Hampus" || __DEV__ === true)) &&
            <>
              <ListItem style={style.listItem} icon={true} onPress={() => navigation.navigate("KeysendTest")}>
                <Left><Icon style={style.icon} type="MaterialIcons" name="developer-mode" /></Left>
                <Body><Text>{t("debug.keysend.title")}</Text></Body>
              </ListItem>
              <ListItem style={style.listItem} icon={true} onPress={() => navigation.navigate("GoogleDriveTestbed")}>
                <Left><Icon style={style.icon} type="Entypo" name="google-drive" /></Left>
                <Body><Text>{t("debug.googleDrive.title")}</Text></Body>
              </ListItem>
              <ListItem style={style.listItem} icon={true} onPress={() => navigation.navigate("WebLNBrowser")}>
                <Left><Icon style={style.icon} type="MaterialIcons" name="local-grocery-store" /></Left>
                <Body><Text>{t("debug.webln.title")}</Text></Body>
              </ListItem>
            </>
          }
          <ListItem style={style.listItem} button={true} icon={true} onPress={() => setupDemo({ changeDb: false })} onLongPress={() => { setupDemo({ changeDb: true }); toast("DB written") }}>
            <Left><Icon style={[style.icon, { marginLeft: 1, marginRight: -1 }]} type="AntDesign" name="mobile1" /></Left>
            <Body>
              <Text>{t("debug.demoMode.title")}</Text>
              <Text note={true}>{t("debug.demoMode.subtitle")}</Text>
            </Body>
          </ListItem>
          <ListItem style={style.listItem} button={true} icon={true} onPress={onToggleLndNoGraphCache}>
            <Left><Icon style={style.icon} type="MaterialCommunityIcons" name="database-sync" /></Left>
            <Body>
              <Text>{t("debug.disableGraphCache.title")}</Text>
            </Body>
            <Right><CheckBox checked={lndNoGraphCache} onPress={onToggleLndNoGraphCache} /></Right>
          </ListItem>
          <ListItem style={style.listItem} icon={true} onPress={() => {
            writeConfig();
            toast(t("msg.written",{ns:namespaces.common}))
          }}>
            <Left><Icon style={style.icon} type="MaterialCommunityIcons" name="typewriter" /></Left>
            <Body><Text>{t("debug.config.title")}</Text></Body>
          </ListItem>
          <ListItem style={style.listItem} button={true} icon={true} onPress={onPressResetMissionControl}>
            <Left><Icon style={style.icon} type="MaterialCommunityIcons" name="restore-alert" /></Left>
            <Body>
              <Text>{t("debug.resetMissionControl.title")}</Text>
            </Body>
          </ListItem>
          <ListItem style={style.listItem} icon={true} onPress={onChangeMultiPartPaymentEnabledPress}>
            <Left><Icon style={style.icon} type="MaterialCommunityIcons" name="multiplication" /></Left>
            <Body>
              <Text>{t("experimental.MPP.title")}</Text>
              <Text note={true}>{t("experimental.MPP.subtitle")}</Text>
            </Body>
            <Right><CheckBox checked={multiPathPaymentsEnabled} onPress={onChangeMultiPartPaymentEnabledPress} /></Right>
          </ListItem>
          <ListItem style={style.listItem} icon={true} onPress={changePersistentServicesEnabledPress}>
            <Left><Icon style={style.icon} type="Entypo" name="globe" /></Left>
            <Body>
              <Text>{t("debug.persistentServices.title")}</Text>
            </Body>
            <Right><CheckBox checked={persistentServicesEnabled} onPress={changePersistentServicesEnabledPress} /></Right>
          </ListItem>
          <ListItem style={style.listItem} icon={true} onPress={changeStrictGraphPruningEnabledPress}>
            <Left><Icon style={style.icon} type="Entypo" name="trash" /></Left>
            <Body>
              <Text>{t("debug.strictGraphPruning.title")}</Text>
            </Body>
            <Right><CheckBox checked={strictGraphPruningEnabled} onPress={changeStrictGraphPruningEnabledPress} /></Right>
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

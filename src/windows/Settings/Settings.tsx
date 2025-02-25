import { BitcoinUnits, IBitcoinUnits } from "../../utils/bitcoin-units";
import { Body, CheckBox, Container, Icon, Left, ListItem, Right, Text } from "native-base";
import {
  DEFAULT_DUNDER_SERVER,
  DEFAULT_INVOICE_EXPIRY,
  DEFAULT_LIGHTNINGBOX_SERVER,
  DEFAULT_LND_LOG_LEVEL,
  DEFAULT_MAX_LN_FEE_PERCENTAGE,
  DEFAULT_NEUTRINO_NODE,
  DEFAULT_SPEEDLOADER_SERVER,
  PLATFORM,
} from "../../utils/constants";
import { Linking, NativeModules, PermissionsAndroid, Platform, StyleSheet } from "react-native";
import { LndLogLevel, OnchainExplorer } from "../../state/Settings";
import React, { useCallback, useLayoutEffect, useMemo } from "react";
import { camelCaseToSpace, formatISO, hexToUint8Array, timeout, toast } from "../../utils";

import { languages, namespaces } from "../../i18n/i18n.constants";
import { useStoreActions, useStoreState } from "../../state/store";

import { Alert } from "../../utils/alert";
import BlixtWallet from "../../components/BlixtWallet";
import { Chain } from "../../utils/build";
import Clipboard from "@react-native-clipboard/clipboard";
import DialogAndroid from "react-native-dialogs";
import DocumentPicker from "react-native-document-picker";
import { IFiatRates } from "../../state/Fiat";
import { LoginMethods } from "../../state/Security";
import { MapStyle } from "../../utils/google-maps";
import TorSvg from "./TorSvg";
import { fromUnixTime } from "date-fns";
import { readFile } from "react-native-fs";
import { useTranslation } from "react-i18next";
import { setBrickDeviceAndExportChannelDb } from "../../storage/app";
import {
  getChanInfo,
  getNodeInfo,
  lookupInvoice,
  routerResetMissionControl,
  routerXImportMissionControl,
  stopDaemon,
  verifyChanBackup,
} from "react-native-turbo-lnd";
import { NavigationRootStackParamList } from "../../types";
import { NavigationProp } from "@react-navigation/native";
import { create, toJson } from "@bufbuild/protobuf";
import { ChannelEdgeSchema, NodeInfoSchema } from "react-native-turbo-lnd/protos/lightning_pb";
import { base64Decode } from "@bufbuild/protobuf/wire";
import { XImportMissionControlRequestSchema } from "react-native-turbo-lnd/protos/routerrpc/router_pb";
import { FlatList } from "react-native";
import { blixtTheme } from "../../native-base-theme/variables/commonColor";

import LndMobileToolsTurbo from "../../turbomodules/NativeLndmobileTools";

let ReactNativePermissions: any;
if (PLATFORM !== "macos") {
  ReactNativePermissions = require("react-native-permissions");
}

interface ISettingsProps {
  navigation: NavigationProp<NavigationRootStackParamList>;
}

interface SettingsItem {
  type: string;
  title: string;
  icon?: { type: string; name?: string } | { type: string };
  subtitle?: string;
  warning?: string;
  onPress?: (...args: any[]) => any;
  onLongPress?: (...args: any[]) => any;
  checkBox?: boolean;
  checked?: boolean;
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
  };

  // Seed
  const seedAvailable = useStoreState((store) => store.security.seedAvailable);
  const getSeed = useStoreActions((store) => store.security.getSeed);
  const deleteSeedFromDevice = useStoreActions((store) => store.security.deleteSeedFromDevice);

  const onGetSeedPress = async () => {
    const seed = await getSeed();
    if (seed) {
      Alert.alert(t("wallet.seed.show.dialog.title"), seed.join(" "), [
        {
          text: t("wallet.seed.show.dialog.copy"),
          onPress: async () => {
            Clipboard.setString(seed.join(" "));
            toast(t("wallet.seed.show.dialog.alert"), undefined, "warning");
          },
        },
        {
          text: t("buttons.ok", { ns: namespaces.common }),
        },
      ]);
    }
  };

  const onRemoveSeedPress = async () => {
    Alert.alert(t("wallet.seed.remove.dialog.title"), t("wallet.seed.remove.dialog.msg"), [
      {
        text: t("buttons.cancel", { ns: namespaces.common }),
      },
      {
        text: t("wallet.seed.remove.dialog.accept"),
        onPress: async () => await deleteSeedFromDevice(),
      },
    ]);
  };

  // Bitcoin unit
  const currentBitcoinUnit = useStoreState((store) => store.settings.bitcoinUnit);
  const changeBitcoinUnit = useStoreActions((store) => store.settings.changeBitcoinUnit);
  const onBitcoinUnitPress = async () => {
    if (PLATFORM === "android") {
      const { selectedItem } = await DialogAndroid.showPicker(null, null, {
        positiveText: null,
        negativeText: t("buttons.cancel", { ns: namespaces.common }),
        type: DialogAndroid.listRadio,
        selectedId: currentBitcoinUnit,
        items: [
          { label: BitcoinUnits.bitcoin.settings, id: "bitcoin" },
          { label: BitcoinUnits.bit.settings, id: "bit" },
          { label: BitcoinUnits.sat.settings, id: "sat" },
          { label: BitcoinUnits.satoshi.settings, id: "satoshi" },
          { label: BitcoinUnits.milliBitcoin.settings, id: "milliBitcoin" },
        ],
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
        onPick: async (currency: string) =>
          await changeBitcoinUnit(currency as keyof IBitcoinUnits),
      });
    }
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
        items: Object.entries(fiatRates).map(([currency]) => {
          return {
            label: currency,
            id: currency,
          };
        }),
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
        onPick: async (currency: string) => await changeFiatUnit(currency as keyof IFiatRates),
        searchEnabled: true,
      });
    }
  };

  // Name
  const name = useStoreState((store) => store.settings.name);
  const changeName = useStoreActions((store) => store.settings.changeName);
  const onNamePress = async () => {
    Alert.prompt(
      t("general.name.title"),
      t("general.name.dialog.msg"),
      [
        {
          text: t("buttons.cancel", { ns: namespaces.common }),
          style: "cancel",
          onPress: () => {},
        },
        {
          text: t("general.name.dialog.accept"),
          onPress: async (text) => {
            await changeName(text ?? null);
          },
        },
      ],
      "plain-text",
      name ?? "",
    );
  };

  // Language
  const changeLanguage = useStoreActions((store) => store.settings.changeLanguage);
  const onLangPress = async () => {
    navigation.navigate("ChangeLanguage", {
      title: t("general.lang.dialog.title"),
      onPick: async (lang: string) => {
        await changeLanguage(lang);
      },
      searchEnabled: true,
      data: Object.keys(languages)
        .sort()
        .map((key) => {
          return {
            title: languages[key].name,
            value: languages[key].id,
          };
        }),
    });
  };

  // Autopilot
  const autopilotEnabled = useStoreState((store) => store.settings.autopilotEnabled);
  const changeAutopilotEnabled = useStoreActions((store) => store.settings.changeAutopilotEnabled);
  const setupAutopilot = useStoreActions((store) => store.lightning.setupAutopilot);
  const onToggleAutopilotPress = () => {
    // TODO why not await?
    if (!rpcReady) {
      return;
    }
    changeAutopilotEnabled(!autopilotEnabled);
    setupAutopilot(!autopilotEnabled);
  };

  // Push Notifications
  const pushNotificationsEnabled = useStoreState(
    (store) => store.settings.pushNotificationsEnabled,
  );
  const changePushNotificationsEnabled = useStoreActions(
    (store) => store.settings.changePushNotificationsEnabled,
  );
  const onTogglePushNotificationsPress = async () => {
    await changePushNotificationsEnabled(!pushNotificationsEnabled);
  };

  // Clipboard invoice check
  const clipboardInvoiceCheckEnabled = useStoreState(
    (store) => store.settings.clipboardInvoiceCheckEnabled,
  );
  const changeClipboardInvoiceCheckEnabled = useStoreActions(
    (store) => store.settings.changeClipboardInvoiceCheckEnabled,
  );
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
      toast(`${t("miscelaneous.appLog.dialog.alert")}: ` + path, 20000, "warning");
    } catch (e: any) {
      console.error(e);
      toast(t("miscelaneous.appLog.dialog.error"), undefined, "danger");
    }
  };

  // Copy lnd log
  const copyLndLog = async () => {
    try {
      await NativeModules.LndMobileTools.copyLndLog();
    } catch (e: any) {
      console.error(e);
      toast(`${t("miscelaneous.lndLog.dialog.error")}: ${e.message}`, undefined, "danger");
    }
  };

  // Copy speedloader log
  const copySpeedloaderLog = async () => {
    try {
      await NativeModules.LndMobileTools.copySpeedloaderLog();
    } catch (e: any) {
      console.error(e);
      toast(`${t("miscelaneous.speedloaderLog.dialog.error")}: ${e.message}`, undefined, "danger");
    }
  };

  // Export channels
  const exportChannelsBackup = useStoreActions((store) => store.channel.exportChannelsBackup);
  const onExportChannelsPress = async () => {
    try {
      const response = await exportChannelsBackup();
    } catch (e: any) {
      console.log(e);
      toast(e.message, 10000, "danger");
    }
  };
  const exportChannelBackupFile = useStoreActions((store) => store.channel.exportChannelBackupFile);
  const onExportChannelsEmergencyPress = async () => {
    try {
      const response = await exportChannelBackupFile();
    } catch (e: any) {
      console.log(e);
      toast(e.message, 10000, "danger");
    }
  };

  // Verify channels backup
  const onVerifyChannelsBackupPress = async () => {
    try {
      const res = await DocumentPicker.pickSingle({
        type: [DocumentPicker.types.allFiles],
      });
      const backupFileUri = PLATFORM === "ios" ? res.uri.replace(/%20/g, " ") : res.uri;
      const backupBase64 = await readFile(backupFileUri, "base64");
      await verifyChanBackup({
        multiChanBackup: {
          multiChanBackup: base64Decode(backupBase64),
        },
      });
      Alert.alert("Channel backup file is valid");
    } catch (e: any) {
      console.log(e);
      if (!e.message?.includes?.("document picker")) {
        Alert.alert("Error verifying channel backup", e.message);
      }
    }
  };

  // Scheduled sync
  const workInfo = useStoreState((store) => store.scheduledSync.workInfo);
  const lastScheduledSync = useStoreState((store) => store.scheduledSync.lastScheduledSync);
  const lastScheduledSyncAttempt = useStoreState(
    (store) => store.scheduledSync.lastScheduledSyncAttempt,
  );
  const scheduledSyncEnabled = useStoreState((store) => store.settings.scheduledSyncEnabled);
  const scheduledGossipSyncEnabled = useStoreState(
    (store) => store.settings.scheduledGossipSyncEnabled,
  );
  const changeScheduledSyncEnabled = useStoreActions(
    (store) => store.settings.changeScheduledSyncEnabled,
  );
  const changeScheduledGossipSyncEnabled = useStoreActions(
    (store) => store.settings.changeScheduledGossipSyncEnabled,
  );

  const setSyncEnabled = useStoreActions((store) => store.scheduledSync.setSyncEnabled);
  const onToggleScheduledSyncEnabled = async () => {
    if (scheduledSyncEnabled)
      Alert.alert(t("security.chainSync.dialog.title"), t("security.chainSync.dialog.msg"), [
        {
          text: t("buttons.cancel", { ns: namespaces.common }),
        },
        {
          text: "Proceed",
          onPress: async () => {
            await setSyncEnabled(!scheduledSyncEnabled);
            await changeScheduledSyncEnabled(!scheduledSyncEnabled);
          },
        },
      ]);
    else {
      await setSyncEnabled(!scheduledSyncEnabled);
      await changeScheduledSyncEnabled(!scheduledSyncEnabled);
    }
  };
  const onLongPressScheduledSyncEnabled = async () => {
    toast(
      `${t("msg.status", { ns: namespaces.common })}: ${workInfo}\n` +
        `${t("msg.lastSyncAttempt", { ns: namespaces.common })}: ${formatISO(
          fromUnixTime(lastScheduledSyncAttempt),
        )}\n` +
        `${t("msg.lastSync", { ns: namespaces.common })}: ${formatISO(
          fromUnixTime(lastScheduledSync),
        )}`,
      0,
      "success",
      t("buttons.ok", { ns: namespaces.common }),
    );
  };
  const onToggleScheduledGossipSyncEnabled = async () => {
    await changeScheduledGossipSyncEnabled(!scheduledGossipSyncEnabled);
  };

  // Debug show startup info
  const debugShowStartupInfo = useStoreState((store) => store.settings.debugShowStartupInfo);
  const changeDebugShowStartupInfo = useStoreActions(
    (store) => store.settings.changeDebugShowStartupInfo,
  );
  const onToggleDebugShowStartupInfo = async () => {
    await changeDebugShowStartupInfo(!debugShowStartupInfo);
  };

  const googleDriveBackupEnabled = useStoreState(
    (store) => store.settings.googleDriveBackupEnabled,
  );
  const changeGoogleDriveBackupEnabled = useStoreActions(
    (store) => store.settings.changeGoogleDriveBackupEnabled,
  );
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
    } else {
      await googleSignOut();
      await changeGoogleDriveBackupEnabled(false);
    }
  };

  const onDoGoogleDriveBackupPress = async () => {
    try {
      await googleDriveMakeBackup();
      toast(t("wallet.backup.googleCloudForce.alert"));
    } catch (e: any) {
      toast(t("wallet.backup.error") + `: ${e.message}`, 10000, "danger");
    }
  };

  const iCloudBackupEnabled = useStoreState((store) => store.settings.iCloudBackupEnabled);
  const changeICloudBackupEnabled = useStoreActions(
    (store) => store.settings.changeICloudBackupEnabled,
  );
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
    } catch (e: any) {
      toast(t("wallet.backup.error") + `: ${e.message}`, 10000, "danger");
    }
  };

  // Transaction geolocation
  const transactionGeolocationEnabled = useStoreState(
    (store) => store.settings.transactionGeolocationEnabled,
  );
  const changeTransactionGeolocationEnabled = useStoreActions(
    (store) => store.settings.changeTransactionGeolocationEnabled,
  );
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
          const r = await ReactNativePermissions.request(
            ReactNativePermissions.PERMISSIONS.IOS.LOCATION_WHEN_IN_USE,
          );
          if (r !== "granted") {
            console.log(t("msg.error", { ns: namespaces.common }) + ": " + r);
          }
        }
      } catch (err: any) {
        console.warn(err);
      }
    }
    await changeTransactionGeolocationEnabled(!transactionGeolocationEnabled);
  };

  // Transaction geolocation map style
  const transactionGeolocationMapStyle = useStoreState(
    (store) => store.settings.transactionGeolocationMapStyle,
  );
  const changeTransactionGeolocationMapStyle = useStoreActions(
    (store) => store.settings.changeTransactionGeolocationMapStyle,
  );
  const onChangeMapStylePress = async () => {
    const { selectedItem } = await DialogAndroid.showPicker(null, null, {
      positiveText: null,
      negativeText: t("buttons.cancel", { ns: namespaces.common }),
      type: DialogAndroid.listRadio,
      selectedId: transactionGeolocationMapStyle,
      items: Object.keys(MapStyle).map((mapStyle) => ({
        id: mapStyle,
        label: camelCaseToSpace(mapStyle),
      })),
    });

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

${t("LN.inbound.dialog.msg3")}`;

    if (PLATFORM === "android") {
      interface ShowPickerResult {
        selectedItem:
          | {
              id: "LNBIG" | "BITREFILL_THOR";
              label: "LN Big" | "Bitrefill Thor";
            }
          | undefined;
      }
      const { selectedItem }: ShowPickerResult = await DialogAndroid.showPicker(null, null, {
        title: t("LN.inbound.dialog.title"),
        content: description,
        positiveText: t("buttons.continue", { ns: namespaces.common }),
        negativeText: t("buttons.cancel", { ns: namespaces.common }),
        type: DialogAndroid.listRadio,
        items: [
          {
            id: "LNBIG",
            label: "LN Big",
          },
          {
            id: "BITREFILL_THOR",
            label: "Bitrefill Thor",
          },
        ],
      });

      if (selectedItem) {
        await goToSite(selectedItem.id);
      }
    } else {
      navigation.navigate("ChannelProvider", {
        title: t("LN.inbound.dialog.title"),
        description,
        data: [
          {
            title: "LN Big",
            value: "LNBIG",
          },
          {
            title: "Bitrefill Thor",
            value: "BITREFILL_THOR",
          },
        ],
        onPick: async (selectedItem: any) => {
          goToSite(selectedItem as any);
        },
      });
    }
  };

  // Onchain explorer
  const onchainExplorer = useStoreState((store) => store.settings.onchainExplorer);
  const changeOnchainExplorer = useStoreActions((store) => store.settings.changeOnchainExplorer);
  const onChangeOnchainExplorerPress = async () => {
    const setCustomExplorer = async () => {
      const explorer = await Alert.promisePromptCallback(
        "Custom Onchain Explorer",
        "Set a custom onchain explorer (https://domain.com/tx/)",
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
        negativeText: t("buttons.cancel", { ns: namespaces.common }),
        type: DialogAndroid.listRadio,
        selectedId: onchainExplorer,
        items: Object.keys(OnchainExplorer)
          .map((currOnchainExplorer) => ({
            id: currOnchainExplorer,
            label: camelCaseToSpace(currOnchainExplorer),
          }))
          .concat({
            id: "CUSTOM",
            label: "Custom explorer",
          }),
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
        data: Object.keys(OnchainExplorer)
          .map((currOnchainExplorer) => ({
            title: camelCaseToSpace(currOnchainExplorer),
            value: currOnchainExplorer,
          }))
          .concat({
            title: "Custom explorer",
            value: "CUSTOM",
          }),
        onPick: async (onchainExplorer: string) => {
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
      Alert.alert(title, message + "\n" + t("bitcoinNetwork.restartDialog.msg1"), [
        {
          style: "cancel",
          text: t("buttons.no", { ns: namespaces.common }),
        },
        {
          style: "default",
          text: t("buttons.yes", { ns: namespaces.common }),
          onPress: async () => {
            try {
              await NativeModules.BlixtTor.stopTor();
              await stopDaemon({});
            } catch (e: any) {
              console.log(e);
            }
            NativeModules.LndMobileTools.restartApp();
          },
        },
      ]);
    } else {
      Alert.alert(title, message);
    }
  };

  const zeroConfPeers = useStoreState((store) => store.settings.zeroConfPeers);
  const changeZeroConfPeers = useStoreActions((store) => store.settings.changeZeroConfPeers);

  const onSetZeroConfPeersPress = async () => {
    Alert.prompt(
      t("LN.zeroConfPeers.title"),
      t("LN.zeroConfPeers.setDialog.msg1") + "\n\n" + t("LN.zeroConfPeers.setDialog.msg2"),
      [
        {
          text: t("buttons.cancel", { ns: namespaces.common }),
          style: "cancel",
          onPress: () => {},
        },
        {
          text: t("LN.zeroConfPeers.title"),
          onPress: async (text) => {
            if (!text) {
              await changeZeroConfPeers([]);
              return;
            }

            const pubkeys = text.split(",").map((n) => n.trim());
            await changeZeroConfPeers(pubkeys);
          },
        },
      ],
      "plain-text",
      zeroConfPeers.join(",") ?? "",
    );
  };

  const onSetBitcoinNodePress = async () => {
    Alert.prompt(
      t("bitcoinNetwork.node.setDialog.title"),
      t("bitcoinNetwork.node.setDialog.info") +
        "\n\n" +
        t("bitcoinNetwork.node.setDialog.leaveBlankToSearch") +
        "\n\n" +
        t("bitcoinNetwork.node.setDialog.longPressToReset", { defaultNode: DEFAULT_NEUTRINO_NODE }),
      [
        {
          text: t("buttons.cancel", { ns: namespaces.common }),
          style: "cancel",
          onPress: () => {},
        },
        {
          text: t("bitcoinNetwork.node.setDialog.title"),
          onPress: async (text) => {
            if (text === neutrinoPeers.join(",")) {
              return;
            }

            if (text) {
              const neutrinoPeers = text.split(",").map((n) => n.trim().replaceAll('"', ""));
              await changeNeutrinoPeers(neutrinoPeers);
            } else {
              await changeNeutrinoPeers([]);
            }
            await writeConfig();

            restartNeeded();
          },
        },
      ],
      "plain-text",
      neutrinoPeers.join(",") ?? "",
    );
  };
  const onSetBitcoinNodeLongPress = async () => {
    Alert.alert(
      t("bitcoinNetwork.node.restoreDialog.title"),
      `${t("bitcoinNetwork.node.restoreDialog.msg")} (${DEFAULT_NEUTRINO_NODE})?`,
      [
        {
          style: "cancel",
          text: t("buttons.no", { ns: namespaces.common }),
        },
        {
          style: "default",
          text: t("buttons.yes", { ns: namespaces.common }),
          onPress: async () => {
            await changeNeutrinoPeers(DEFAULT_NEUTRINO_NODE);
            await writeConfig();
            restartNeeded();
          },
        },
      ],
    );
  };

  // bitcoind RPC host
  const bitcoindRpcHost = useStoreState((store) => store.settings.bitcoindRpcHost);
  const changeBitcoindRpcHost = useStoreActions((store) => store.settings.changeBitcoindRpcHost);
  const onSetBitcoindRpcHostPress = async () => {
    Alert.prompt(
      t("bitcoinNetwork.rpc.title"),
      "",
      [
        {
          text: t("buttons.cancel", { ns: namespaces.common }),
          style: "cancel",
          onPress: () => {},
        },
        {
          text: t("buttons.save", { ns: namespaces.common }),
          onPress: async (text) => {
            if (text) {
              await changeBitcoindRpcHost(text);
              await writeConfig();
            }
          },
        },
      ],
      "plain-text",
      bitcoindRpcHost ?? "",
    );
  };

  // bitcoind RPC user
  const bitcoindRpcUser = useStoreState((store) => store.settings.bitcoindRpcUser);
  const changeBitcoindRpcUser = useStoreActions((store) => store.settings.changeBitcoindRpcUser);
  const onSetBitcoindRpcUserPress = async () => {
    Alert.prompt(
      t("bitcoinNetwork.rpcuser.title"),
      "",
      [
        {
          text: t("buttons.cancel", { ns: namespaces.common }),
          style: "cancel",
          onPress: () => {},
        },
        {
          text: t("buttons.save", { ns: namespaces.common }),
          onPress: async (text) => {
            if (text) {
              await changeBitcoindRpcUser(text);
              await writeConfig();
            }
          },
        },
      ],
      "plain-text",
      bitcoindRpcUser ?? "",
    );
  };

  // bitcoind RPC password
  const bitcoindRpcPassword = useStoreState((store) => store.settings.bitcoindRpcPassword);
  const changeBitcoindRpcPassword = useStoreActions(
    (store) => store.settings.changeBitcoindRpcPassword,
  );
  const onSetBitcoindRpcPasswordPress = async () => {
    Alert.prompt(
      t("bitcoinNetwork.rpcpass.title"),
      "",
      [
        {
          text: t("buttons.cancel", { ns: namespaces.common }),
          style: "cancel",
          onPress: () => {},
        },
        {
          text: t("buttons.save", { ns: namespaces.common }),
          onPress: async (text) => {
            if (text) {
              await changeBitcoindRpcPassword(text);
              await writeConfig();
            }
          },
        },
      ],
      "plain-text",
      bitcoindRpcPassword ?? "",
    );
  };

  // bitcoind zmq block
  const bitcoindPubRawBlock = useStoreState((store) => store.settings.bitcoindPubRawBlock);
  const changeBitcoindPubRawBlock = useStoreActions(
    (store) => store.settings.changeBitcoindPubRawBlock,
  );
  const onSetBitcoindPubRawBlockPress = async () => {
    Alert.prompt(
      t("bitcoinNetwork.zmqRawBlock.title"),
      "",
      [
        {
          text: t("buttons.cancel", { ns: namespaces.common }),
          style: "cancel",
          onPress: () => {},
        },
        {
          text: t("buttons.save", { ns: namespaces.common }),
          onPress: async (text) => {
            if (text) {
              await changeBitcoindPubRawBlock(text);
              await writeConfig();
            }
          },
        },
      ],
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
      [
        {
          text: t("buttons.cancel", { ns: namespaces.common }),
          style: "cancel",
          onPress: () => {},
        },
        {
          text: t("buttons.save", { ns: namespaces.common }),
          onPress: async (text) => {
            if (text) {
              await changeBitcoindPubRawTx(text);
              await writeConfig();
            }
          },
        },
      ],
      "plain-text",
      bitcoindPubRawTx ?? "",
    );
  };

  // Multi-path payments
  const multiPathPaymentsEnabled = useStoreState(
    (store) => store.settings.multiPathPaymentsEnabled,
  );
  const changeMultiPathPaymentsEnabled = useStoreActions(
    (store) => store.settings.changeMultiPathPaymentsEnabled,
  );
  const onChangeMultiPartPaymentEnabledPress = async () => {
    await changeMultiPathPaymentsEnabled(!multiPathPaymentsEnabled);
  };

  const torEnabled = useStoreState((store) => store.settings.torEnabled);
  const changeTorEnabled = useStoreActions((store) => store.settings.changeTorEnabled);
  const onChangeTorEnabled = async () => {
    const text = !torEnabled
      ? `${t("experimental.tor.enabled.msg1")}

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
      : `${t("experimental.tor.disabled.msg1")}
${t("experimental.tor.disabled.msg2")}`;

    Alert.alert("Tor", text, [
      { text: t("buttons.no", { ns: namespaces.common }) },
      {
        text: t("buttons.yes", { ns: namespaces.common }),
        onPress: async () => {
          await changeTorEnabled(!torEnabled);
          if (PLATFORM === "android") {
            try {
              await stopDaemon({});
            } catch (e: any) {
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
      },
    ]);
  };

  const hideExpiredInvoices = useStoreState((store) => store.settings.hideExpiredInvoices);
  const changeHideExpiredInvoices = useStoreActions(
    (store) => store.settings.changeHideExpiredInvoices,
  );
  const onToggleHideExpiredInvoicesPress = async () => {
    await changeHideExpiredInvoices(!hideExpiredInvoices);
  };

  const onShowOnionAddressPress = async () => {
    navigation.navigate("TorShowOnionAddress");
  };

  const screenTransitionsEnabled = useStoreState(
    (store) => store.settings.screenTransitionsEnabled,
  );
  const changeScreenTransitionsEnabled = useStoreActions(
    (store) => store.settings.changeScreenTransitionsEnabled,
  );
  const onToggleScreenTransitionsEnabledPress = async () => {
    await changeScreenTransitionsEnabled(!screenTransitionsEnabled);
  };

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

        Alert.alert(t("miscelaneous.signMessage.dialog2.title"), signMessageResponse.signature, [
          {
            text: t("buttons.ok", { ns: namespaces.common }),
          },
          {
            text: t("buttons.copy", { ns: namespaces.common }),
            onPress: async () => {
              Clipboard.setString(signMessageResponse.signature);
              toast(t("miscelaneous.signMessage.dialog2.alert"), undefined, "warning");
            },
          },
        ]);
      },
      "plain-text",
    );
  };

  // Dunder server
  const dunderServer = useStoreState((store) => store.settings.dunderServer);
  const changeDunderServer = useStoreActions((store) => store.settings.changeDunderServer);

  const onSetDunderServerPress = async () => {
    Alert.prompt(
      t("LN.LSP.setDialog.title"),
      "",
      [
        {
          text: t("buttons.cancel", { ns: namespaces.common }),
          style: "cancel",
          onPress: () => {},
        },
        {
          text: t("LN.LSP.setDialog.acept"),
          onPress: async (text) => {
            if (text === dunderServer) {
              return;
            }

            await changeDunderServer(text ?? "");
          },
        },
      ],
      "plain-text",
      dunderServer ?? "",
    );
  };
  const onSetDunderServerLongPress = async () => {
    Alert.alert(
      t("LN.LSP.restoreDialog.title"),
      `${t("LN.LSP.restoreDialog.msg")} (${DEFAULT_DUNDER_SERVER})?`,
      [
        {
          style: "cancel",
          text: t("buttons.no", { ns: namespaces.common }),
        },
        {
          style: "default",
          text: t("buttons.yes", { ns: namespaces.common }),
          onPress: async () => {
            await changeDunderServer(DEFAULT_DUNDER_SERVER);
          },
        },
      ],
    );
  };

  // Speedloader server
  const speedloaderServer = useStoreState((store) => store.settings.speedloaderServer);
  const changeSpeedloaderServer = useStoreActions(
    (store) => store.settings.changeSpeedloaderServer,
  );

  const onSetSpeedloaderServerPress = async () => {
    Alert.prompt(
      t("LN.speedloaderServer.setDialog.title"),
      "",
      [
        {
          text: t("buttons.cancel", { ns: namespaces.common }),
          style: "cancel",
          onPress: () => {},
        },
        {
          style: "default",
          text: t("buttons.yes", { ns: namespaces.common }),
          onPress: async (text) => {
            if (text === speedloaderServer) {
              return;
            }

            await changeSpeedloaderServer(text ?? "");
          },
        },
      ],
      "plain-text",
      speedloaderServer ?? "",
    );
  };
  const onSetSpeedloaderServerLongPress = async () => {
    Alert.alert(
      t("LN.speedloaderServer.restoreDialog.title"),
      `${t("LN.speedloaderServer.restoreDialog.msg")} (${DEFAULT_SPEEDLOADER_SERVER})?`,
      [
        {
          style: "cancel",
          text: t("buttons.no", { ns: namespaces.common }),
        },
        {
          style: "default",
          text: t("buttons.yes", { ns: namespaces.common }),
          onPress: async () => {
            await changeSpeedloaderServer(DEFAULT_SPEEDLOADER_SERVER);
          },
        },
      ],
    );
  };

  // Enable Dunder LSP
  const dunderEnabled = useStoreState((store) => store.settings.dunderEnabled);
  const changeDunderEnabled = useStoreActions((store) => store.settings.changeDunderEnabled);
  const onToggleDunderEnabled = async () => {
    await changeDunderEnabled(!dunderEnabled);
  };

  // Set Max LN Fee Percentage
  const maxLNFeePercentage = useStoreState((store) => store.settings.maxLNFeePercentage);
  const changeMaxLNFeePercentage = useStoreActions(
    (store) => store.settings.changeMaxLNFeePercentage,
  );
  const onPressLNFee = async () => {
    Alert.prompt(
      t("LN.maxLNFeePercentage.dialog.title"),
      undefined,
      async (text) => {
        try {
          const fee = Number.parseFloat(text);

          if (fee <= 0 ?? fee >= 100) {
            return;
          }

          await changeMaxLNFeePercentage(fee);
        } catch (error: any) {
          toast(error.message, 5, "danger");
        }
      },
      undefined,
      maxLNFeePercentage.toString(),
    );
  };

  const onLongPressLNFee = async () => {
    Alert.alert(
      "",
      t("LN.maxLNFeePercentage.resetDialog.title", {
        defaultMaxLNFee: DEFAULT_MAX_LN_FEE_PERCENTAGE,
      }),
      [
        {
          style: "cancel",
          text: t("buttons.no", { ns: namespaces.common }),
        },
        {
          style: "default",
          text: t("buttons.yes", { ns: namespaces.common }),
          onPress: async () => {
            await changeMaxLNFeePercentage(DEFAULT_MAX_LN_FEE_PERCENTAGE);
          },
        },
      ],
    );
  };

  // Require graph sync before paying
  const requireGraphSync = useStoreState((store) => store.settings.requireGraphSync);
  const changeRequireGraphSync = useStoreActions((store) => store.settings.changeRequireGraphSync);
  const onToggleRequireGraphSyncPress = async () => {
    await changeRequireGraphSync(!requireGraphSync);
  };

  const onLndMobileHelpCenterPress = async () => {
    navigation.navigate("LndMobileHelpCenter");
  };

  const onGetNodeInfoPress = async () => {
    Alert.prompt(
      "Get node info",
      "Enter Node ID",
      [
        {
          text: "Cancel",
          style: "cancel",
          onPress: () => {},
        },
        {
          text: "Get info",
          onPress: async (text) => {
            if (text === "") {
              return;
            }
            try {
              const nodeInfo = await getNodeInfo({
                pubKey: text?.split("@")[0],
              });
              Alert.alert("", JSON.stringify(toJson(NodeInfoSchema, nodeInfo), null, 2));
            } catch (e: any) {
              Alert.alert(e.message);
            }
          },
        },
      ],
      "plain-text",
    );
  };

  const onGetChanInfoPress = async () => {
    Alert.prompt(
      "Get channel info",
      "Enter Channel ID",
      [
        {
          text: "Cancel",
          style: "cancel",
          onPress: () => {},
        },
        {
          text: "Get info",
          onPress: async (text) => {
            if (text === "") {
              return;
            }
            try {
              const nodeInfo = await getChanInfo({ chanId: text });
              Alert.alert("", JSON.stringify(toJson(ChannelEdgeSchema, nodeInfo), null, 2));
            } catch (e: any) {
              Alert.alert(e.message);
            }
          },
        },
      ],
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
      "number-pad",
    );

    try {
      const expiryNumber = Number.parseInt(expiryString, 10);
      await changeInvoiceExpiry(expiryNumber);
    } catch (e: any) {
      Alert.alert("", "Could not update expiry.\n" + e.message);
    }
  };

  const onLongPressSetInvoiceExpiry = async () => {
    Alert.alert(
      "",
      `Would you like to restore the invoice expiry to the default value (${DEFAULT_INVOICE_EXPIRY} seconds)?`,
      [
        {
          style: "cancel",
          text: "No",
        },
        {
          style: "default",
          text: "Yes",
          onPress: async () => {
            await changeInvoiceExpiry(DEFAULT_INVOICE_EXPIRY);
          },
        },
      ],
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
      await routerResetMissionControl({});
      toast("Done");
    } catch (error: any) {
      toast(t("msg.error", { ns: namespaces.common }) + ": " + error.message, 0, "danger", "OK");
    }
  };

  // Strict Graph Pruning
  const strictGraphPruningEnabled = useStoreState(
    (store) => store.settings.strictGraphPruningEnabled,
  );
  const changeStrictGraphPruningEnabled = useStoreActions(
    (store) => store.settings.changeStrictGraphPruningEnabled,
  );
  const changeStrictGraphPruningEnabledPress = async () => {
    await changeStrictGraphPruningEnabled(!strictGraphPruningEnabled);
    await writeConfig();
    toast(t("msg.written", { ns: namespaces.common }));
  };

  // Bimodal path finding
  const lndPathfindingAlgorithm = useStoreState((store) => store.settings.lndPathfindingAlgorithm);
  const changeBimodalPathFindingEnabled = useStoreActions(
    (store) => store.settings.changeLndPathfindingAlgorithm,
  );
  const changeBimodalPathFindingEnabledPress = async () => {
    const modal =
      lndPathfindingAlgorithm === "apriori" || lndPathfindingAlgorithm === null
        ? "bimodal"
        : "apriori";

    await changeBimodalPathFindingEnabled(modal);
    await writeConfig();
    toast(t("msg.written", { ns: namespaces.common }));
    restartNeeded();
  };

  const lndLogLevel = useStoreState((store) => store.settings.lndLogLevel);
  const changeLndLogLevel = useStoreActions((store) => store.settings.changeLndLogLevel);
  const onPressSetLndLogLevel = async () => {
    const logLevels: LndLogLevel[] = [/*"trace", */ "debug", "info", "warn", "error", "critical"];

    navigation.navigate("ChangeLndLogLevel", {
      title: t("miscelaneous.setLndLogLevel.dialog.title"),
      description: t("miscelaneous.setLndLogLevel.dialog.description"),
      data: logLevels.map((logLevel) => ({
        title: logLevel,
        value: logLevel,
      })),
      onPick: async (logLevel: any) => {
        if (logLevel === lndLogLevel) {
          return;
        }
        await changeLndLogLevel(logLevel);
        await writeConfig();
        restartNeeded();
      },
    });
  };
  const onLongPressSetLndLogLevel = async () => {
    Alert.alert(
      "",
      t("miscelaneous.setLndLogLevel.restoreDialog.title", {
        defaultLndLogLevel: DEFAULT_LND_LOG_LEVEL,
      }),
      [
        {
          style: "cancel",
          text: t("buttons.no", { ns: namespaces.common }),
        },
        {
          style: "default",
          text: t("buttons.yes", { ns: namespaces.common }),
          onPress: async () => {
            await changeLndLogLevel(DEFAULT_LND_LOG_LEVEL);
            await writeConfig();
            restartNeeded();
          },
        },
      ],
    );
  };

  // Compact lnd databases
  const changeLndCompactDb = useStoreActions((store) => store.settings.changeLndCompactDb);
  const onPressLndCompactDb = async () => {
    await changeLndCompactDb(true);
    restartNeeded();
  };

  // Enforce speedloader on startup
  const enforceSpeedloaderOnStartup = useStoreState(
    (store) => store.settings.enforceSpeedloaderOnStartup,
  );
  const changeEnforceSpeedloaderOnStartup = useStoreActions(
    (store) => store.settings.changeEnforceSpeedloaderOnStartup,
  );
  const onPressEnforceSpeedloaderOnStartup = async () => {
    await changeEnforceSpeedloaderOnStartup(!enforceSpeedloaderOnStartup);
  };

  // Persistent services
  const persistentServicesEnabled = useStoreState(
    (store) => store.settings.persistentServicesEnabled,
  );
  const changePersistentServicesEnabled = useStoreActions(
    (store) => store.settings.changePersistentServicesEnabled,
  );
  const changePersistentServicesEnabledPress = async () => {
    await changePersistentServicesEnabled(!persistentServicesEnabled);
    restartNeeded();
  };

  // Custom invoice preimage
  const customInvoicePreimageEnabled = useStoreState(
    (store) => store.settings.customInvoicePreimageEnabled,
  );
  const changeCustomInvoicePreimageEnabled = useStoreActions(
    (store) => store.settings.changeCustomInvoicePreimageEnabled,
  );
  const onToggleCustomInvoicePreimageEnabled = async () => {
    await changeCustomInvoicePreimageEnabled(!customInvoicePreimageEnabled);
  };

  // Lightning Box server
  const lightningBoxServer = useStoreState((store) => store.settings.lightningBoxServer);
  const changeLightningBoxAddress = useStoreActions(
    (store) => store.settings.changeLightningBoxAddress,
  );
  const changeLightningBoxServer = useStoreActions(
    (store) => store.settings.changeLightningBoxServer,
  );

  const onSetLightningBoxServerPress = async () => {
    Alert.prompt(
      t("LN.lightningBoxServer.setDialog.title"),
      "",
      [
        {
          text: t("buttons.cancel", { ns: namespaces.common }),
          style: "cancel",
          onPress: () => {},
        },
        {
          style: "default",
          text: t("buttons.yes", { ns: namespaces.common }),
          onPress: async (text) => {
            if (text === lightningBoxServer) {
              return;
            }

            await changeLightningBoxAddress("");
            await changeLightningBoxServer(text ?? "");
          },
        },
      ],
      "plain-text",
      lightningBoxServer ?? "",
    );
  };
  const onSetLightningBoxServerLongPress = async () => {
    Alert.alert(
      t("LN.lightningBoxServer.restoreDialog.title"),
      `${t("LN.lightningBoxServer.restoreDialog.msg")} (${DEFAULT_LIGHTNINGBOX_SERVER})?`,
      [
        {
          style: "cancel",
          text: t("buttons.no", { ns: namespaces.common }),
        },
        {
          style: "default",
          text: t("buttons.yes", { ns: namespaces.common }),
          onPress: async () => {
            await changeLightningBoxAddress("");
            await changeLightningBoxServer(DEFAULT_LIGHTNINGBOX_SERVER);
          },
        },
      ],
    );
  };

  const onPressLookupInvoiceByHash = async () => {
    try {
      const hash = await Alert.promisePromptCallback(
        "Lookup invoice",
        "Provide payment hash",
        "plain-text",
      );
      const invoice = await lookupInvoice({
        rHashStr: hash,
      });
      Alert.alert("", JSON.stringify(invoice, undefined, 2));
    } catch (error: any) {
      toast("Error: " + error.message, 10000, "danger");
    }
  };

  // Hide amounts
  const hideAmountsEnabled = useStoreState((store) => store.settings.hideAmountsEnabled);
  const changeHideAmountsEnabled = useStoreActions(
    (store) => store.settings.changeHideAmountsEnabled,
  );
  const onToggleHideAmountsEnabled = async () => {
    await changeHideAmountsEnabled(!hideAmountsEnabled);
  };

  // Change backend to bitcoindWithZmq
  const changeLndChainBackend = useStoreActions((store) => store.settings.changeLndChainBackend);
  const onPressChangeBackendToBitcoindWithZmq = async () => {
    await changeLndChainBackend("bitcoindWithZmq");
  };

  // Change backend to neutrino
  const onPressChangeBackendToNeutrino = async () => {
    await changeLndChainBackend("neutrino");
  };

  // Randomize settings
  const randomize = useStoreActions((store) => store.settings.randomize);
  const onPressRandomize = async () => {
    await randomize();
  };

  const randomizeSettingsOnStartup = useStoreState(
    (store) => store.settings.randomizeSettingsOnStartup,
  );
  const changeRandomizeSettingsOnStartup = useStoreActions(
    (store) => store.settings.changeRandomizeSettingsOnStartup,
  );
  const onToggleRandomizeSettingsOnStartup = async () => {
    await changeRandomizeSettingsOnStartup(!randomizeSettingsOnStartup);
  };

  // Export channel db and brick
  const onPressExportChannelDbAndBrickInstance = async () => {
    try {
      const result = await Alert.promiseAlert(
        "Export channel db and brick",
        "Are you sure you want to export the channel db and brick?",
        [
          { text: "Cancel", style: "cancel" },
          { text: "OK", style: "default" },
        ],
      );
      if (result.style === "cancel") {
        return;
      }

      if (PLATFORM === "android") {
        await setSyncEnabled(false);
        await changeScheduledSyncEnabled(false);
      }

      await setBrickDeviceAndExportChannelDb(true);
      await stopDaemon({});

      Alert.alert("Restart the app to continue the procedure.", "", [
        {
          text: "OK",
          onPress() {
            if (PLATFORM === "android") {
              NativeModules.LndMobileTools.restartApp();
            }
          },
        },
      ]);
    } catch (e: any) {
      toast("Error: " + e.message, 10000, "danger");
      return;
    }
  };

  // Restore SCB file
  const onPressRestoreChannelBackup = async () => {
    try {
      const res = await DocumentPicker.pickSingle({
        type: [DocumentPicker.types.allFiles],
      });
      console.log(res);

      let backupBase64: string;
      const backupFileUri = PLATFORM === "ios" ? res.uri.replace(/%20/g, " ") : res.uri;
      try {
        backupBase64 = await readFile(backupFileUri, PLATFORM === "android" ? "base64" : undefined);
      } catch (e: any) {
        backupBase64 = await readFile(backupFileUri, PLATFORM === "android" ? undefined : "base64");
      }

      // TURBOTODO needs to be replaced
      // await restoreChannelBackups(backupBase64);
    } catch (error: any) {
      toast("Error: " + error.message, 10000, "danger");
    }
  };

  const settingsData = useMemo((): SettingsItem[] => {
    return [
      { type: "header", title: t("general.title") },
      {
        type: "item",
        icon: { type: "AntDesign", name: "edit" },
        title: t("general.name.title"),
        subtitle: name || t("general.name.subtitle"),
        onPress: onNamePress,
      },
      {
        type: "item",
        icon: { type: "Entypo", name: "language" },
        title: t("general.lang.title"),
        subtitle: languages[i18n.language].name,
        onPress: onLangPress,
      },
      {
        type: "item",
        icon: { type: "Entypo", name: "bell" },
        title: t("general.pushNotification.title"),
        subtitle: t("general.pushNotification.subtitle"),
        checkBox: true,
        checked: pushNotificationsEnabled,
        onPress: onTogglePushNotificationsPress,
      },
      {
        type: "item",
        icon: { type: "Entypo", name: "clipboard" },
        title: t("general.checkClipboard.title"),
        subtitle: t("general.checkClipboard.subtitle"),
        checkBox: true,
        checked: clipboardInvoiceCheckEnabled,
        onPress: onToggleClipBoardInvoiceCheck,
      },
      ...(["android", "ios"].includes(PLATFORM)
        ? [
            {
              type: "item",
              icon: { type: "Entypo", name: "location-pin" },
              title: t("general.saveGeolocation.title"),
              subtitle: t("general.saveGeolocation.subtitle"),
              checkBox: true,
              checked: transactionGeolocationEnabled,
              onPress: onToggleTransactionGeolocationEnabled,
            },
          ]
        : []),
      ...(transactionGeolocationEnabled && PLATFORM === "android"
        ? [
            {
              type: "item",
              icon: { type: "MaterialCommunityIcons", name: "google-maps" },
              title: t("general.mapTheme.title"),
              subtitle: camelCaseToSpace(transactionGeolocationMapStyle),
              onPress: onChangeMapStylePress,
            },
          ]
        : []),
      {
        type: "item",
        icon: { type: "Feather", name: "align-justify" },
        title: t("general.hideAmountsEnabled.title"),
        checkBox: true,
        checked: hideAmountsEnabled,
        onPress: onToggleHideAmountsEnabled,
      },

      // ... Wallet items

      { type: "header", title: t("wallet.title") },
      ...(seedAvailable
        ? [
            {
              type: "item",
              icon: { type: "AntDesign", name: "form" },
              title: t("wallet.seed.show.title"),
              subtitle: t("wallet.seed.show.subtitle"),
              onPress: onGetSeedPress,
            },
            ...(onboardingState === "DONE"
              ? [
                  {
                    type: "item",
                    icon: { type: "Entypo", name: "eraser" },
                    title: t("wallet.seed.remove.title"),
                    subtitle: t("wallet.seed.remove.subtitle"),
                    onPress: onRemoveSeedPress,
                  },
                ]
              : []),
          ]
        : []),
      ...(["android", "ios", "macos"].includes(PLATFORM)
        ? [
            {
              type: "item",
              icon: { type: "MaterialIcons", name: "save" },
              title: t("wallet.backup.export.title"),
              onPress: onExportChannelsPress,
              onLongPress: onExportChannelsEmergencyPress,
            },
          ]
        : []),
      ...(["android", "ios"].includes(PLATFORM)
        ? [
            {
              type: "item",
              icon: { type: "MaterialIcons", name: "backup" },
              title: t("wallet.backup.verify.title"),
              onPress: onVerifyChannelsBackupPress,
            },
          ]
        : []),
      ...(PLATFORM === "android" && !isRecoverMode
        ? [
            {
              type: "item",
              icon: { type: "MaterialCommunityIcons", name: "google-drive" },
              title: t("wallet.backup.googleCloud.title"),
              subtitle: t("wallet.backup.googleCloud.subtitle"),
              checkBox: true,
              checked: googleDriveBackupEnabled,
              onPress: onToggleGoogleDriveBackup,
            },
          ]
        : []),
      ...(googleDriveBackupEnabled && !isRecoverMode
        ? [
            {
              type: "item",
              icon: { type: "MaterialCommunityIcons", name: "folder-google-drive" },
              title: t("wallet.backup.googleCloudForce.title"),
              onPress: onDoGoogleDriveBackupPress,
            },
          ]
        : []),
      ...(PLATFORM === "ios" && !isRecoverMode
        ? [
            {
              type: "item",
              icon: { type: "MaterialCommunityIcons", name: "apple-icloud" },
              title: t("wallet.backup.iCloud.title"),
              subtitle: t("wallet.backup.iCloud.subtitle"),
              checkBox: true,
              checked: iCloudBackupEnabled,
              onPress: onToggleICloudBackup,
            },
          ]
        : []),
      ...(iCloudBackupEnabled && !isRecoverMode
        ? [
            {
              type: "item",
              icon: { type: "MaterialCommunityIcons", name: "folder" },
              title: t("wallet.backup.iCloudForce.title"),
              onPress: onDoICloudBackupPress,
            },
          ]
        : []),

      // ... Security items

      { type: "header", title: t("security.title") },
      {
        type: "item",
        icon: { type: "AntDesign", name: "lock" },
        title: t("security.pincode.title"),
        checkBox: true,
        checked: loginMethods.has(LoginMethods.pincode),
        onPress: loginMethods.has(LoginMethods.pincode) ? onRemovePincodePress : onSetPincodePress,
      },
      ...(fingerprintAvailable
        ? [
            {
              type: "item",
              icon: {
                type: biometricsSensor !== "Face ID" ? "Entypo" : "MaterialCommunityIcons",
                name: biometricsSensor !== "Face ID" ? "fingerprint" : "face-recognition",
              },
              title: `${t("security.biometrics.title")} ${
                biometricsSensor === "Biometrics"
                  ? t("security.biometrics.fingerprint")
                  : biometricsSensor === "Face ID"
                    ? t("security.biometrics.faceId")
                    : biometricsSensor === "Touch ID"
                      ? t("security.biometrics.touchID")
                      : ""
              }`,
              checkBox: true,
              checked: fingerPrintEnabled,
              onPress: onToggleFingerprintPress,
            },
          ]
        : []),
      ...(PLATFORM === "android"
        ? [
            {
              type: "item",
              icon: { type: "MaterialCommunityIcons", name: "sync-alert" },
              title: t("security.chainSync.title"),
              subtitle: t("security.chainSync.subtitle"),
              checkBox: true,
              checked: scheduledSyncEnabled,
              onPress: onToggleScheduledSyncEnabled,
              onLongPress: onLongPressScheduledSyncEnabled,
            },
          ]
        : []),

      // ... Display items

      { type: "header", title: t("display.title") },
      {
        type: "item",
        icon: { type: "FontAwesome", name: "money" },
        title: t("display.fiatUnit.title"),
        subtitle: currentFiatUnit,
        onPress: onFiatUnitPress,
      },
      {
        type: "item",
        icon: { type: "FontAwesome5", name: "btc" },
        title: t("display.bitcoinUnit.title"),
        subtitle: BitcoinUnits[currentBitcoinUnit].settings,
        onPress: onBitcoinUnitPress,
      },
      {
        type: "item",
        icon: { type: "FontAwesome", name: "chain" },
        title: t("display.onchainExplorer.title"),
        subtitle:
          onchainExplorer in OnchainExplorer ? camelCaseToSpace(onchainExplorer) : onchainExplorer,
        onPress: onChangeOnchainExplorerPress,
      },

      // ... Bitcoin Network items

      { type: "header", title: t("bitcoinNetwork.title") },
      ...(lndChainBackend === "neutrino"
        ? [
            {
              type: "item",
              icon: { type: "MaterialCommunityIcons", name: "router-network" },
              title: t("bitcoinNetwork.node.title"),
              subtitle: t("bitcoinNetwork.node.subtitle"),
              onPress: onSetBitcoinNodePress,
              onLongPress: onSetBitcoinNodeLongPress,
            },
          ]
        : []),
      ...(lndChainBackend === "bitcoindWithZmq"
        ? [
            {
              type: "item",
              icon: { type: "MaterialCommunityIcons", name: "router-network" },
              title: t("bitcoinNetwork.rpc.title"),
              onPress: onSetBitcoindRpcHostPress,
            },
            {
              type: "item",
              icon: { type: "MaterialCommunityIcons", name: "router-network" },
              title: t("bitcoinNetwork.zmqRawBlock.title"),
              onPress: onSetBitcoindPubRawBlockPress,
            },
            {
              type: "item",
              icon: { type: "MaterialCommunityIcons", name: "router-network" },
              title: t("bitcoinNetwork.zmqRawTx.title"),
              onPress: onSetBitcoindPubRawTxPress,
            },
          ]
        : []),
      ...(lndChainBackend === "bitcoindWithRpcPolling"
        ? [
            {
              type: "item",
              icon: { type: "MaterialCommunityIcons", name: "router-network" },
              title: t("bitcoinNetwork.rpc.title"),
              onPress: onSetBitcoindRpcHostPress,
            },
            {
              type: "item",
              icon: { type: "MaterialCommunityIcons", name: "router-network" },
              title: t("bitcoinNetwork.rpcuser.title"),
              onPress: onSetBitcoindRpcUserPress,
            },
            {
              type: "item",
              icon: { type: "MaterialCommunityIcons", name: "router-network" },
              title: t("bitcoinNetwork.rpcpass.title"),
              onPress: onSetBitcoindRpcPasswordPress,
            },
          ]
        : []),

      // ... Lightning Network items

      { type: "header", title: t("LN.title") },
      {
        type: "item",
        icon: { type: "Feather", name: "user" },
        title: t("LN.node.title"),
        onPress: () => navigation.navigate("LightningNodeInfo"),
      },
      {
        type: "item",
        icon: { type: "Feather", name: "users" },
        title: t("LN.peers.title"),
        onPress: () => navigation.navigate("LightningPeers"),
      },
      {
        type: "item",
        icon: { type: "Entypo", name: "network" },
        title: t("LN.network.title"),
        onPress: () => navigation.navigate("LightningNetworkInfo"),
      },
      {
        type: "item",
        icon: { type: "MaterialCommunityIcons", name: "cash" },
        title: t("LN.maxLNFeePercentage.title"),
        subtitle: t("LN.maxLNFeePercentage.subtitle"),
        onPress: onPressLNFee,
        onLongPress: onLongPressLNFee,
      },
      {
        type: "item",
        icon: { type: "Entypo", name: "circular-graph" },
        title: t("LN.autopilot.title"),
        checkBox: true,
        checked: autopilotEnabled,
        onPress: onToggleAutopilotPress,
      },
      {
        type: "item",
        icon: { type: "MaterialCommunityIcons", name: "cloud-download" },
        title: t("LN.inbound.title"),
        subtitle: t("LN.inbound.subtitle"),
        onPress: onInboundServiceListPress,
      },
      {
        type: "item",
        icon: { type: "Entypo", name: "slideshare" },
        title: t("experimental.LSP.title"),
        subtitle: t("experimental.LSP.subtitle"),
        checkBox: true,
        checked: dunderEnabled,
        onPress: onToggleDunderEnabled,
      },
      ...(dunderEnabled
        ? [
            {
              type: "item",
              icon: { type: "Entypo", name: "slideshare" },
              title: t("LN.LSP.title"),
              subtitle: dunderServer,
              onPress: onSetDunderServerPress,
              onLongPress: onSetDunderServerLongPress,
            },
          ]
        : []),
      ...(scheduledGossipSyncEnabled
        ? [
            {
              type: "item",
              icon: { type: "MaterialCommunityIcons", name: "speedometer" },
              title: t("LN.speedloaderServer.title"),
              subtitle: speedloaderServer,
              onPress: onSetSpeedloaderServerPress,
              onLongPress: onSetSpeedloaderServerLongPress,
            },
          ]
        : []),
      {
        type: "item",
        icon: { type: "MaterialCommunityIcons", name: "database-sync" },
        title: t("LN.graphSync.title"),
        subtitle: t("LN.graphSync.subtitle"),
        checkBox: true,
        checked: requireGraphSync,
        onPress: onToggleRequireGraphSyncPress,
      },
      {
        type: "item",
        icon: { type: "MaterialCommunityIcons", name: "router-network" },
        title: t("LN.zeroConfPeers.title"),
        subtitle: t("LN.zeroConfPeers.subtitle"),
        onPress: onSetZeroConfPeersPress,
      },

      // ... Miscellaneous items

      { type: "header", title: t("miscelaneous.title") },
      {
        type: "item",
        icon: { type: "AntDesign", name: "info" },
        title: t("miscelaneous.about.title"),
        onPress: () => navigation.navigate("About"),
      },

      ...(PLATFORM === "android"
        ? [
            {
              type: "item",
              icon: { type: "AntDesign", name: "copy1" },
              title: t("miscelaneous.appLog.title"),
              onPress: () => copyAppLog(),
            },
          ]
        : []),
      ...(["android", "ios", "macos"].includes(PLATFORM)
        ? [
            {
              type: "item",
              icon: { type: "AntDesign", name: "copy1" },
              title: t("miscelaneous.lndLog.title"),
              onPress: () => copyLndLog(),
            },
          ]
        : []),
      ...(scheduledGossipSyncEnabled && ["android", "ios", "macos"].includes(PLATFORM)
        ? [
            {
              type: "item",
              icon: { type: "AntDesign", name: "copy1" },
              title: t("miscelaneous.speedloaderLog.title"),
              onPress: () => copySpeedloaderLog(),
            },
          ]
        : []),
      {
        type: "item",
        icon: { type: "MaterialCommunityIcons", name: "file-hidden" },
        title: t("miscelaneous.expiredInvoices.title"),
        checkBox: true,
        checked: hideExpiredInvoices,
        onPress: onToggleHideExpiredInvoicesPress,
      },
      {
        type: "item",
        icon: { type: "Ionicons", name: "swap-horizontal" },
        title: t("miscelaneous.screenTransactions.title"),
        checkBox: true,
        checked: screenTransitionsEnabled,
        onPress: onToggleScreenTransitionsEnabledPress,
      },
      {
        type: "item",
        icon: { type: "FontAwesome5", name: "file-signature" },
        title: t("miscelaneous.signMessage.title"),
        onPress: onPressSignMesseage,
      },
      {
        type: "item",
        icon: { type: "MaterialCommunityIcons", name: "account-lock" },
        title: t("miscelaneous.customInvoicePreimageEnabled.title"),
        checkBox: true,
        checked: customInvoicePreimageEnabled,
        onPress: onToggleCustomInvoicePreimageEnabled,
      },
      {
        type: "item",
        icon: { type: "MaterialCommunityIcons", name: "emoticon-cool" },
        title: t("miscelaneous.randomizeSettings.title"),
        onPress: onPressRandomize,
      },
      {
        type: "item",
        icon: { type: "MaterialCommunityIcons", name: "emoticon-cool" },
        title: t("miscelaneous.randomizeSettingsOnStartup.title"),
        checkBox: true,
        checked: randomizeSettingsOnStartup,
        onPress: onToggleRandomizeSettingsOnStartup,
      },

      // ... Experimental items

      { type: "header", title: t("experimental.title") },

      ...(["android", "ios"].includes(PLATFORM) && !isRecoverMode
        ? [
            {
              type: "item",
              icon: { type: "torsvg" },
              title: t("experimental.tor.title"),
              checkBox: true,
              checked: torEnabled,
              onPress: onChangeTorEnabled,
            },
          ]
        : []),

      ...(torEnabled && PLATFORM === "android"
        ? [
            {
              type: "item",
              icon: { type: "AntDesign", name: "qrcode" },
              title: t("experimental.onion.title"),
              subtitle: t("experimental.onion.subtitle"),
              onPress: onShowOnionAddressPress,
            },
          ]
        : []),
      {
        type: "item",
        icon: { type: "MaterialCommunityIcons", name: "timer-outline" },
        title: t("experimental.invoiceExpiry.title"),
        subtitle: t("experimental.invoiceExpiry.subtitle", { expiry: invoiceExpiry }),
        onPress: onPressSetInvoiceExpiry,
        onLongPress: onLongPressSetInvoiceExpiry,
      },

      {
        type: "item",
        icon: { type: "MaterialCommunityIcons", name: "map-marker-path" },
        title: t("debug.bimodalPathFinding.title"),
        checkBox: true,
        checked: lndPathfindingAlgorithm !== "apriori" && lndPathfindingAlgorithm !== null,
        onPress: changeBimodalPathFindingEnabledPress,
      },
      ...(Chain === "mainnet"
        ? [
            {
              type: "item",
              icon: { type: "MaterialCommunityIcons", name: "cog-sync" },
              title:
                PLATFORM === "android"
                  ? t("security.gossipSyncAndroid.title")
                  : t("security.gossipSync.title"),
              subtitle:
                PLATFORM === "android" ? t("security.gossipSyncAndroid.subtitle") : undefined,
              checkBox: true,
              checked: scheduledGossipSyncEnabled,
              onPress: onToggleScheduledGossipSyncEnabled,
            },
          ]
        : []),
      ...(PLATFORM === "android"
        ? [
            {
              type: "item",
              icon: { type: "Entypo", name: "globe" },
              title: t("debug.persistentServices.title"),
              subtitle: t("debug.persistentServices.subtitle"),
              checkBox: true,
              checked: persistentServicesEnabled,
              onPress: changePersistentServicesEnabledPress,
            },
          ]
        : []),
      ...(PLATFORM === "android"
        ? [
            {
              type: "item",
              icon: { type: "FontAwesome", name: "inbox" },
              title: t("LN.lightningBoxServer.title"),
              subtitle: lightningBoxServer,
              onPress: onSetLightningBoxServerPress,
              onLongPress: onSetLightningBoxServerLongPress,
            },
          ]
        : []),

      // ... Debug items

      { type: "header", title: t("debug.title") },
      ...(name === "Hampus" || __DEV__ === true
        ? [
            {
              type: "item",
              icon: { type: "MaterialIcons", name: "developer-mode" },
              title: t("miscelaneous.dev.title"),
              onPress: () => navigation.navigate("DEV_CommandsX"),
            },
          ]
        : []),
      {
        type: "item",
        icon: { type: "MaterialCommunityIcons", name: "android-debug-bridge" },
        title: t("debug.startup.title"),
        checkBox: true,
        checked: debugShowStartupInfo,
        onPress: onToggleDebugShowStartupInfo,
      },
      {
        type: "item",
        icon: { type: "MaterialCommunityIcons", name: "format-list-bulleted" },
        title: t("debug.showNotifications.title"),
        onPress: () => navigation.navigate("ToastLog"),
      },
      {
        type: "item",
        icon: { type: "MaterialCommunityIcons", name: "format-list-bulleted" },
        title: t("debug.showDebugLog.title"),
        onPress: () => navigation.navigate("DebugLog"),
      },
      {
        type: "item",
        icon: { type: "MaterialCommunityIcons", name: "restart" },
        title: t("debug.rescanWallet.title"),
        subtitle: t("debug.rescanWallet.subtitle"),
        onPress: onPressRescanWallet,
      },
      {
        type: "item",
        icon: { type: "Entypo", name: "lifebuoy" },
        title: t("debug.helpCencer.title"),
        onPress: onLndMobileHelpCenterPress,
      },
      {
        type: "item",
        icon: { type: "Entypo", name: "info" },
        title: t("debug.getNodeInfo.title"),
        onPress: onGetNodeInfoPress,
      },
      {
        type: "item",
        icon: { type: "Entypo", name: "info" },
        title: t("debug.getChannelInfo.title"),
        onPress: onGetChanInfoPress,
      },
      ...(dunderEnabled
        ? [
            {
              type: "item",
              icon: { type: "Entypo", name: "slideshare" },
              title: t("debug.LSP.title"),
              onPress: () => navigation.navigate("DunderDoctor"),
            },
          ]
        : []),
      {
        type: "item",
        icon: { type: "Ionicons", name: "newspaper-outline" },
        title: t("debug.lndLog.title"),
        onPress: async () => navigation.navigate("LndLog"),
      },
      ...(scheduledGossipSyncEnabled
        ? [
            {
              type: "item",
              icon: { type: "Ionicons", name: "newspaper-outline" },
              title: t("debug.speedloaderLog.title"),
              onPress: async () => navigation.navigate("SpeedloaderLog"),
            },
          ]
        : []),
      {
        type: "item",
        icon: { type: "MaterialCommunityIcons", name: "file-code" },
        title: t("miscelaneous.setLndLogLevel.title"),
        subtitle: lndLogLevel,
        onPress: onPressSetLndLogLevel,
        onLongPress: onLongPressSetLndLogLevel,
      },
      ...(name === "Hampus" || __DEV__ === true
        ? [
            {
              type: "item",
              icon: { type: "MaterialIcons", name: "developer-mode" },
              title: t("debug.keysend.title"),
              onPress: () => navigation.navigate("KeysendTest"),
            },
            {
              type: "item",
              icon: { type: "Entypo", name: "google-drive" },
              title: t("debug.googleDrive.title"),
              onPress: () => navigation.navigate("GoogleDriveTestbed"),
            },
            {
              type: "item",
              icon: { type: "MaterialIcons", name: "local-grocery-store" },
              title: t("debug.webln.title"),
              onPress: () => navigation.navigate("WebLNBrowser"),
            },
          ]
        : []),
      {
        type: "item",
        icon: { type: "AntDesign", name: "mobile1" },
        title: t("debug.demoMode.title"),
        subtitle: t("debug.demoMode.subtitle"),
        onPress: () => setupDemo({ changeDb: false }),
        onLongPress: () => {
          setupDemo({ changeDb: true });
          toast("DB written");
        },
      },
      {
        type: "item",
        icon: { type: "MaterialCommunityIcons", name: "database-sync" },
        title: t("debug.disableGraphCache.title"),
        onPress: onToggleLndNoGraphCache,
        checkBox: true,
        checked: lndNoGraphCache,
      },
      {
        type: "item",
        icon: { type: "MaterialCommunityIcons", name: "typewriter" },
        title: t("debug.config.title"),
        onPress: () => {
          writeConfig();
          toast(t("msg.written", { ns: namespaces.common }));
        },
      },
      {
        type: "item",
        icon: { type: "MaterialCommunityIcons", name: "restore-alert" },
        title: t("debug.resetMissionControl.title"),
        onPress: onPressResetMissionControl,
      },
      {
        type: "item",
        icon: { type: "MaterialCommunityIcons", name: "multiplication" },
        title: t("experimental.MPP.title"),
        subtitle: t("experimental.MPP.subtitle"),
        onPress: onChangeMultiPartPaymentEnabledPress,
        checkBox: true,
        checked: multiPathPaymentsEnabled,
      },
      {
        type: "item",
        icon: { type: "Entypo", name: "trash" },
        title: t("debug.strictGraphPruning.title"),
        onPress: changeStrictGraphPruningEnabledPress,
        checkBox: true,
        checked: strictGraphPruningEnabled,
      },
      {
        type: "item",
        icon: { type: "AntDesign", name: "shrink" },
        title: t("debug.compactLndDatabases.title"),
        onPress: onPressLndCompactDb,
      },
      ...(scheduledGossipSyncEnabled
        ? [
            {
              type: "item",
              icon: { type: "MaterialCommunityIcons", name: "run-fast" },
              title: t("debug.enforceSpeedloaderOnStartup.title"),
              onPress: onPressEnforceSpeedloaderOnStartup,
              checkBox: true,
              checked: enforceSpeedloaderOnStartup,
            },
          ]
        : []),
      {
        type: "item",
        icon: { type: "MaterialCommunityIcons", name: "run-fast" },
        title: "Dunder MissionControl import",
        onPress: async () => {
          try {
            console.log(`${dunderServer}/channel-liquidity`);
            const res = await fetch(`${dunderServer}/channel-liquidity`);

            const json: { pairs: any[] } = await res.json();
            const schema = create(XImportMissionControlRequestSchema, {
              pairs: json.pairs
                .filter((c) => c.history.successAmtSat > 0)
                .map((c) => {
                  return {
                    nodeFrom: hexToUint8Array(c.nodeFrom),
                    nodeTo: hexToUint8Array(c.nodeTo),
                    history: {
                      successAmtSat: BigInt(c.history.successAmtSat),
                      successTime: BigInt(c.history.successTime),
                    },
                  };
                }),
            });

            await routerXImportMissionControl({
              pairs: schema.pairs,
            });

            toast("Done");
          } catch (e: any) {
            toast("Error: " + e.message, 10000, "danger");
          }
        },
      },
      {
        type: "item",
        icon: { type: "Foundation", name: "page-delete" },
        title: "Stop lnd and delete neutrino files",
        onPress: async () => {
          try {
            await stopDaemon({});
            await timeout(5000); // Let lnd close down
          } catch (e: any) {
            if (e?.message?.includes?.("closed")) {
              console.log("yes closed");
            } else {
              toast("Error: " + e.message, 10000, "danger");
              return;
            }
          }

          console.log(NativeModules.LndMobileTools.DEBUG_deleteNeutrinoFiles());
          toast("Done. Restart is required");
          restartNeeded();
        },
      },
      {
        type: "item",
        icon: { type: "AntDesign", name: "file1" },
        title: "Lookup invoice",
        onPress: onPressLookupInvoiceByHash,
      },
      ...(lndChainBackend === "neutrino"
        ? [
            {
              type: "item",
              icon: { type: "AntDesign", name: "file1" },
              title: "Change bitcoin backend to bitcoindWithZmq",
              onPress: onPressChangeBackendToBitcoindWithZmq,
            },
          ]
        : []),
      ...(lndChainBackend !== "neutrino"
        ? [
            {
              type: "item",
              icon: { type: "AntDesign", name: "file1" },
              title: "Change bitcoin backend to neutrino",
              onPress: onPressChangeBackendToNeutrino,
            },
          ]
        : []),
      {
        type: "item",
        icon: { type: "FontAwesome", name: "stop" },
        title: "Stop lnd",
        onPress: async () => {
          try {
            await stopDaemon({});
          } catch (e: any) {
            toast("Error: " + e.message, 10000, "danger");
            return;
          }
        },
      },
      ...(PLATFORM === "android" && name === "Hampus"
        ? [
            {
              type: "item",
              icon: { type: "MaterialCommunityIcons", name: "file-export" },
              title: "Export channel.db file and permanently disable this instance of Blixt Wallet",
              subtitle: "Use this feature to migrate this wallet to another device or to lnd.",
              warning: "Only do this if you're know what you're doing",
              onPress: onPressExportChannelDbAndBrickInstance,
            },
          ]
        : []),
      {
        type: "item",
        icon: { type: "MaterialCommunityIcons", name: "file-export" },
        title: "Restore SCB channel backup file",
        onPress: onPressRestoreChannelBackup,
      },
      ...(PLATFORM === "android"
        ? [
            {
              type: "item",
              icon: { type: "MaterialCommunityIcons", name: "cellphone-information" },
              title: "Sync worker report",
              onPress: () => navigation.navigate("SyncWorkerReport"),
            },
            {
              type: "item",
              icon: { type: "MaterialCommunityIcons", name: "cellphone-information" },
              title: "Sync worker timeline report",
              onPress: () => navigation.navigate("SyncWorkerTimelineReport"),
            },
            {
              type: "item",
              icon: { type: "MaterialCommunityIcons", name: "sync-circle" },
              title: "Schedule periodic sync",
              onPress: () => {
                LndMobileToolsTurbo.scheduleSyncWorker();
                toast("Periodic sync scheduled");
              },
            },
            {
              type: "item",
              icon: { type: "MaterialCommunityIcons", name: "sync-off" },
              title: "Stop scheduled sync",
              onPress: () => {
                LndMobileToolsTurbo.stopScheduleSyncWorker();
                toast("Scheduled sync stopped");
              },
            },
          ]
        : []),
    ];
  }, [
    t,
    i18n,
    name,
    pushNotificationsEnabled,
    clipboardInvoiceCheckEnabled,
    transactionGeolocationEnabled,
    transactionGeolocationMapStyle,
    PLATFORM,
    hideAmountsEnabled,
    seedAvailable,
    onboardingState,
    googleDriveBackupEnabled,
    iCloudBackupEnabled,
    isRecoverMode,
    loginMethods,
    fingerprintAvailable,
    biometricsSensor,
    scheduledSyncEnabled,
    currentFiatUnit,
    currentBitcoinUnit,
    onchainExplorer,
    lndChainBackend,
    autopilotEnabled,
    dunderServer,
    speedloaderServer,
    requireGraphSync,
    dunderEnabled,
    hideExpiredInvoices,
    screenTransitionsEnabled,
    customInvoicePreimageEnabled,
    randomizeSettingsOnStartup,
    torEnabled,
    lndPathfindingAlgorithm,
    scheduledGossipSyncEnabled,
    persistentServicesEnabled,
    lightningBoxServer,
    debugShowStartupInfo,
    lndLogLevel,
    lndNoGraphCache,
    multiPathPaymentsEnabled,
    strictGraphPruningEnabled,
    enforceSpeedloaderOnStartup,
  ]);

  const renderItem = useCallback(({ item }: { item: SettingsItem }) => {
    if (item.type === "header") {
      return <Text style={styles.itemHeader}>{item.title}</Text>;
    }
    return (
      <ListItem style={styles.listItem} icon onPress={item.onPress} onLongPress={item.onLongPress}>
        <Left>
          {item.icon?.type === "torsvg" ? (
            <TorSvg />
          ) : (
            <Icon style={styles.icon} type={item.icon?.type} name={item.icon?.name} />
          )}
        </Left>
        <Body>
          <Text>{item.title}</Text>
          {item.subtitle && <Text note>{item.subtitle}</Text>}
          {item.warning && (
            <Text note={true} style={{ color: blixtTheme.red }}>
              {item.warning}
            </Text>
          )}
        </Body>
        {item.checkBox && (
          <Right>
            <CheckBox checked={item.checked} onPress={item.onPress} />
          </Right>
        )}
      </ListItem>
    );
  }, []);

  return (
    <Container>
      <FlatList
        data={settingsData}
        renderItem={renderItem}
        ListHeaderComponent={<BlixtWallet />}
        contentContainerStyle={{ padding: 14 }}
        initialNumToRender={21}
        keyExtractor={(item, index) => `${item.title}-${index}`}
        maxToRenderPerBatch={15}
        removeClippedSubviews={true}
      />
    </Container>
  );
}

const styles = StyleSheet.create({
  listItem: {
    paddingLeft: 2,
    paddingRight: 2,
  },
  itemHeader: {
    paddingLeft: 8,
    paddingRight: 8,
    paddingTop: 24,
    paddingBottom: 16,
    fontWeight: "bold",
  },
  icon: {
    fontSize: 22,
    ...Platform.select({
      web: {
        marginRight: 5,
      },
    }),
  },
});

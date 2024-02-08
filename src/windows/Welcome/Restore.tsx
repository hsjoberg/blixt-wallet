import React, { useState } from "react";
import { StatusBar, StyleSheet, Alert, NativeModules, TextInput } from "react-native";
import DocumentPicker, { DocumentPickerResponse } from "react-native-document-picker";
import { readFile } from "react-native-fs";
import { Text, View, Button, H1, Textarea, Spinner, H3 } from "native-base";
import { StackNavigationProp } from "@react-navigation/stack";

import { WelcomeStackParamList } from "./index";
import { useStoreActions, useStoreState } from "../../state/store";
import { blixtTheme } from "../../native-base-theme/variables/commonColor";
import Container from "../../components/Container";
import { ICreateWalletPayload } from "../../state";
import { getStatusBarHeight } from "react-native-status-bar-height";
import { PLATFORM } from "../../utils/constants";
import { CommonActions } from "@react-navigation/native";
import GoBackIcon from "../../components/GoBackIcon";
import Input from "../../components/Input";
import { toast } from "../../utils";

import { useTranslation } from "react-i18next";
import { namespaces } from "../../i18n/i18n.constants";

const iconTopPadding = (StatusBar.currentHeight ?? 0) + getStatusBarHeight(true);

interface IProps {
  navigation: StackNavigationProp<WelcomeStackParamList, "Restore">;
}
export default function Restore({ navigation }: IProps) {
  const t = useTranslation(namespaces.welcome.restore).t;
  const [loading, setLoading] = useState(false);
  const [seedText, setSeedText] = useState("");
  const [passphraseText, setPassphraseText] = useState("");
  const [backupType, setBackupType] = useState<"file" | "google_drive" | "icloud" | "macos" | "none">("none");
  const [backupFile, setBackupFile] = useState<DocumentPickerResponse | null>(null);
  const [macosBakBase64, setMacosBakBase64] = useState<string | undefined>();
  const [b64Backup, setB64Backup] = useState<string | null>(null);
  const setWalletSeed = useStoreActions((store) => store.setWalletSeed);
  const createWallet = useStoreActions((store) => store.createWallet);
  const isSignedInGoogle = useStoreState((store) => store.google.isSignedIn);
  const signInGoogle = useStoreActions((store) => store.google.signIn);
  const googleDriveGetBackupFile = useStoreActions((store => store.googleDriveBackup.getBackupFile));
  const iCloudGetBackup = useStoreActions((store => store.iCloudBackup.getBackup));
  const iCloudActive = useStoreState((store) => store.iCloudBackup.iCloudActive);

  const setSyncEnabled = useStoreActions((state) => state.scheduledSync.setSyncEnabled);
  const changeScheduledSyncEnabled = useStoreActions((state) => state.settings.changeScheduledSyncEnabled);
  const changeAutopilotEnabled = useStoreActions((store) => store.settings.changeAutopilotEnabled);
  const changeOnboardingState = useStoreActions((store) => store.changeOnboardingState);

  const onRestorePress = async () => {
    try {
      // Note: the first trim is not a mistake, it's to trim out "white-space words" that could exist after the split
      const splittedSeed = seedText.trim().split(" ").map((word) => word.trim());
      if (splittedSeed.length !== 24) {
        Alert.alert(t("restore.seed"));
        return;
      }
      setLoading(true);
      setWalletSeed(splittedSeed);

      const createWalletOpts: ICreateWalletPayload = {
        restore: {
          restoreWallet: true,
          aezeedPassphrase: passphraseText,
        }
      }

      if (backupType === "file") {
        if (backupFile) {
          // Due to system restrictions, we cannot deal with binary files
          // on iOS, thus the backup file is saved as a base64-string.
          //
          // In other to keep compatibility between platforms,
          // the native expected format for each platform is tried,
          // if an error is retrieved, the reverse is tried.
          //
          // For Android want `readFile` to convert the binary to base64.
          // For iOS we want `readFile` to just read the file as a string (it's already in base64).
          let backupBase64: string;
          const backupFileUri = PLATFORM === "ios" ? backupFile.uri.replace(/%20/g, " ") : backupFile.uri;
          try {
            backupBase64 = await readFile(backupFileUri, PLATFORM === "android" ? "base64" : undefined);
          } catch (e) {
            backupBase64 = await readFile(backupFileUri, PLATFORM === "android" ? undefined : "base64");
          }
          createWalletOpts.restore!.channelsBackup = backupBase64;
        }
      } else if (backupType === "google_drive" || backupType === "icloud") {
        createWalletOpts.restore!.channelsBackup = b64Backup!;
      } else if (backupType === "macos") {
        createWalletOpts.restore!.channelsBackup = macosBakBase64;
      }

      await createWallet(createWalletOpts);

      await Promise.all([
        changeAutopilotEnabled(false),
        setSyncEnabled(true), // TODO test
        changeScheduledSyncEnabled(true),
        changeOnboardingState("DONE"),
      ]);

      navigation.dispatch(
        CommonActions.reset({
          index: 0,
          routes: [
            { name: "Loading" },
          ],
        })
      );
    } catch (e) {
      console.log(e);
      setLoading(false);
      Alert.alert(e.message);
    }
  };

  const googleDriveBackup = async () => {
    if (!isSignedInGoogle) {
      if (!(await signInGoogle())) {
        return;
      }
    }

    try {
      const base64Backup = await googleDriveGetBackupFile();
      console.log(base64Backup);
      setB64Backup(base64Backup);
      setBackupType("google_drive");
    } catch (e) {
      Alert.alert(`${t("restore.channel.google.alert")}:\n\n${e.message}`);
    }
  };

  const iCloudBackup = async () => {
    try {
      const base64Backup = await iCloudGetBackup()
      console.log(base64Backup);
      setB64Backup(base64Backup);
      setBackupType("icloud");
    } catch (e) {
      Alert.alert(`${t("restore.channel.iCloud.alert")}:\n\n${e.message}`);
    }
  };

  const pickChannelsExportFile = async () => {
    try {
      if (PLATFORM !== "macos") {
        const res = await DocumentPicker.pickSingle({
          type: [DocumentPicker.types.allFiles],
        });
        console.log(res);
        setBackupFile(res);
        setBackupType("file");
      } else {
        const b = await NativeModules.LndMobileTools.macosOpenFileDialog();
        console.log(b);
        setMacosBakBase64(b);
        setBackupType("macos");
      }

    } catch (e) {
      console.log(e);
      toast(e.message, undefined, "danger", "Okay");
    }
  }

  const undoBackupChoice = () => {
    setBackupFile(null);
    setB64Backup(null);
    setMacosBakBase64(null);
    setBackupType("none");
  }

  return (
    <Container>
      <StatusBar
        backgroundColor={blixtTheme.dark}
        hidden={false}
        translucent={true}
        networkActivityIndicatorVisible={true}
        barStyle="light-content"
      />
      <View style={style.content}>
        <View style={style.upperContent}>
          <View style={style.seed}>
            {PLATFORM !== "android" && <GoBackIcon style={style.goBack} />}

            {/* FIXME: react-native-macos breaks with multiline=true, onChangeText never fires */}
            <TextInput
              style={style.seedBox}
              onChangeText={setSeedText}
              multiline={PLATFORM !== "macos"}
              underlineColorAndroid="rgba(0,0,0,0)"
              returnKeyType="done"
              blurOnSubmit={true}
              autoComplete="off"
              autoCapitalize="none"
              autoCorrect={false}
              importantForAutofill="no"
              editable={true}
            />
            {/* <Textarea
              style={style.seedBox}
              bordered={false}
              underline={false}
              onChangeText={setSeedText}
              value={seedText}
              returnKeyType="done"
              blurOnSubmit={true}
              autoComplete="off"
              autoCapitalize="none"
              autoCorrect={false}
              importantForAutofill="no"
            /> */}
            <View style={{ height: 45 }}>
              <Input
                style={style.passphrase}
                value={passphraseText}
                onChangeText={setPassphraseText}
                placeholder={t("restore.passphrase.placeholder") ?? ""}
                secureTextEntry={true}
              />
            </View>
            <View style={{ marginTop: 14, width: "100%", display: "flex" }}>
              <H3>{t("restore.channel.title")}</H3>
              {backupType === "none" &&
                <View style={{ display: "flex", flexDirection: "column" }}>
                  <Button style={{ marginTop: 6, marginBottom: 10 }} small onPress={pickChannelsExportFile}>
                    <Text>
                      {backupFile === null && t("restore.channel.file")}
                    </Text>
                  </Button>
                  {PLATFORM === "android" &&
                    <Button small onPress={googleDriveBackup}>
                      <Text>
                        {t("restore.channel.google.title")}
                      </Text>
                    </Button>
                  }
                  {(PLATFORM === "ios" && iCloudActive) &&
                    <Button small onPress={iCloudBackup}>
                      <Text>
                        {t("restore.channel.iCloud.title")}
                      </Text>
                    </Button>
                  }
                </View>
              }
              {(backupType === "file" || backupType === "macos") &&
                <View style={{ flexDirection: "row", justifyContent: "space-between"}}>
                  <Text>{backupFile &&  backupFile.name}</Text>
                  <Button small onPress={undoBackupChoice}>
                    <Text>
                      x
                    </Text>
                  </Button>
                </View>
              }
              {backupType === "google_drive" &&
                <View style={{ flexDirection: "row", justifyContent: "space-between"}}>
                  <Text>{t("backup.google")}</Text>
                  <Button small onPress={undoBackupChoice}>
                    <Text>
                      x
                    </Text>
                  </Button>
                </View>
              }
              {backupType === "icloud" &&
                <View style={{ flexDirection: "row", justifyContent: "space-between"}}>
                  <Text>{t("backup.iCloud")}</Text>
                  <Button small onPress={undoBackupChoice}>
                    <Text>
                      x
                    </Text>
                  </Button>
                </View>
              }
            </View>
          </View>
          <View style={style.text}>
            <H1 style={style.textHeader}>{t("restore.title")}</H1>
            <Text>
              {t("restore.msg")}{"\n"}{"\n"}
              {t("restore.msg1")}
            </Text>
          </View>
        </View>
        <View style={style.buttons}>
          <Button block={true} onPress={onRestorePress} disabled={loading}>
            {!loading && <Text>{t("restore.title")}</Text>}
            {loading && <Spinner color={blixtTheme.light} />}
          </Button>
        </View>
      </View>
    </Container>
  );
}

const style = StyleSheet.create({
  content: {
    marginTop: iconTopPadding,
    width: "100%",
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingLeft: 16,
    paddingRight: 16,
    paddingBottom: 16,
  },
  seed: {
    padding: 12,
    width: "100%",
    marginTop: 32,
    flexDirection: "column",
    justifyContent: "center",
    alignContent: "center",
  },
  seedBox: {
    textAlignVertical: "top",
    width: "100%",
    height: 120,
    backgroundColor: blixtTheme.gray,
    fontSize: 20,
    marginTop: PLATFORM !== "android" ? 60 : undefined,
  },
  passphrase: {
    width: "100%",
    height: 45,
    backgroundColor: blixtTheme.gray,
    fontSize: 12,
    marginTop: 12,
  },
  upperContent: {
    width: "100%",
    height: "100%",
  },
  buttons: {
    paddingRight: 9,
    paddingBottom: 24,
    paddingLeft: 9,
    width: "100%",
    bottom: 24,
    backgroundColor: blixtTheme.dark,
  },
  text: {
    flex: 1,
    marginTop: 24,
    width: "100%",
  },
  textHeader: {
    marginBottom: 3,
  },
  card: {

  },
  cardItem: {
    width: "100%",
    flex: 1,
    flexDirection: "row",
    justifyContent: "space-around",
  },
  wordColumn: {
    flex: 1,
    height: "100%",
    justifyContent: "space-around",
  },
  goBack: {
    paddingHorizontal: 20,
    marginLeft: -20,
    paddingVertical: 6,
    marginTop: -3,
    top: 0,
    left: 0,
    position: "absolute",
  },
});

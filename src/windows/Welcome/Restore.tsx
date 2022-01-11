import React, { useState } from "react";
import { StatusBar, StyleSheet, Alert } from "react-native";
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

const iconTopPadding = (StatusBar.currentHeight ?? 0) + getStatusBarHeight(true);

interface IProps {
  navigation: StackNavigationProp<WelcomeStackParamList, "Restore">;
}
export default function Restore({ navigation }: IProps) {
  const [loading, setLoading] = useState(false);
  const [seedText, setSeedText] = useState("");
  const [backupType, setBackupType] = useState<"file" | "google_drive" | "icloud" | "none">("none");
  const [backupFile, setBackupFile] = useState<DocumentPickerResponse | null>(null);
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
      const splittedSeed = seedText.split(" ");
      if (splittedSeed.length !== 24) {
        Alert.alert("Seed must be exactly 24 words");
        return;
      }
      setLoading(true);
      setWalletSeed(splittedSeed);

      const createWalletOpts: ICreateWalletPayload = {
        restore: {
          restoreWallet: true,
        }
      }

      if (backupType === "file") {
        if (backupFile) {
          // Due to system restrictions, we cannot deal with binary files
          // on iOS, thus the backup file is saved as a base64-string.
          //
          // In other to keep compatiblity between platforms,
          // the native expected format for each platform is tried,
          // if an error is retrieved, the reverse is tried.
          //
          // For Android want `readFile` to convert the binary to base64.
          // For iOS we want `readFile` to just read the file as a string (it's already in base64).
          let backupBase64: string;
          try {
            backupBase64 = await readFile(backupFile.uri, PLATFORM === "android" ? "base64" : undefined);
          } catch (e) {
            backupBase64 = await readFile(backupFile.uri, PLATFORM === "android" ? undefined : "base64");
          }
          createWalletOpts.restore!.channelsBackup = backupBase64;
        }
      }
      else if (backupType === "google_drive" || backupType === "icloud") {
        createWalletOpts.restore!.channelsBackup = b64Backup!;
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
      Alert.alert(`Restoring via Google Drive failed:\n\n${e.message}`);
    }
  };

  const iCloudBackup = async () => {
    try {
      const base64Backup = await iCloudGetBackup()
      console.log(base64Backup);
      setB64Backup(base64Backup);
      setBackupType("icloud");
    } catch (e) {
      Alert.alert(`Restoring via iClouod failed:\n\n${e.message}`);
    }
  };

  const pickChannelsExportFile = async () => {
    try {
      const res = await DocumentPicker.pickSingle({
        type: [DocumentPicker.types.allFiles],
      });
      console.log(res);
      setBackupFile(res);
      setBackupType("file");
    } catch (e) {
      console.log(e);
    }
  }

  const undoBackupChoice = () => {
    setBackupFile(null);
    setB64Backup(null);
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
            <Textarea
              style={style.seedBox}
              rowSpan={6}
              bordered={false}
              underline={false}
              onChangeText={setSeedText}
              value={seedText}
              returnKeyType="done"
              blurOnSubmit={true}
            />
            <View style={{ marginTop: 14, width: "100%", display: "flex" }}>
              <H3>Channel backup</H3>
              {backupType === "none" &&
                <View style={{ display: "flex", flexDirection: "column" }}>
                  <Button style={{ marginTop: 6, marginBottom: 10 }} small onPress={pickChannelsExportFile}>
                    <Text>
                      {backupFile === null && "Choose channel backup file on disk"}
                    </Text>
                  </Button>
                  {PLATFORM === "android" &&
                    <Button small onPress={googleDriveBackup}>
                      <Text>
                        Restore via Google Drive
                      </Text>
                    </Button>
                  }
                  {(PLATFORM === "ios" && iCloudActive) &&
                    <Button small onPress={iCloudBackup}>
                      <Text>
                        Restore via iCloud
                      </Text>
                    </Button>
                  }
                </View>
              }
              {backupType === "file" &&
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
                  <Text>Backup via Google Drive</Text>
                  <Button small onPress={undoBackupChoice}>
                    <Text>
                      x
                    </Text>
                  </Button>
                </View>
              }
              {backupType === "icloud" &&
                <View style={{ flexDirection: "row", justifyContent: "space-between"}}>
                  <Text>Backup via iCloud</Text>
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
            <H1 style={style.textHeader}>Restore wallet</H1>
            <Text>
              To restore your wallet, write each word from your seed separated by a space.{"\n"}{"\n"}
              If you wish to restore your Lightning Network channels, you need to provide a file backup.
            </Text>
          </View>
        </View>
        <View style={style.buttons}>
          <Button block={true} onPress={onRestorePress} disabled={loading}>
            {!loading && <Text>Restore Wallet</Text>}
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
    height: 300,
    flexDirection: "column",
    justifyContent: "center",
    alignContent: "center",
  },
  seedBox: {
    width: "100%",
    height: 150,
    backgroundColor: blixtTheme.gray,
    fontSize: 20,
    marginTop: PLATFORM !== "android" ? 60 : undefined,
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

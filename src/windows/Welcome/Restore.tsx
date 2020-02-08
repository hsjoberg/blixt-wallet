import React, { useState } from "react";
import { StatusBar, StyleSheet, Alert } from "react-native";
import DocumentPicker, { DocumentPickerResponse } from "react-native-document-picker";
import { readFile } from "react-native-fs";
import { Text, View, Button, H1, Textarea, Spinner, H3 } from "native-base";
import { StackNavigationProp } from "@react-navigation/stack";

import { WelcomeStackParamList } from "./index";
import { useStoreActions, useStoreState } from "../../state/store";
import { blixtTheme } from "../../../native-base-theme/variables/commonColor";
import Container from "../../components/Container";
import Content from "../../components/Content";
import { ICreateWalletPayload } from "../../state";

interface IProps {
  navigation: StackNavigationProp<WelcomeStackParamList, "Restore">;
}
export default ({ navigation }: IProps) => {
  const [loading, setLoading] = useState(false);
  const [seedText, setSeedText] = useState("");
  const [backupType, setBackupType] = useState<"file" | "google_drive" | "none">("none");
  const [backupFile, setBackupFile] = useState<DocumentPickerResponse | null>(null);
  const [b64Backup, setB64Backup] = useState<string | null>(null);
  const setWalletSeed = useStoreActions((store) => store.setWalletSeed);
  const createWallet = useStoreActions((store) => store.createWallet);
  const isSignedInGoogle = useStoreState((store) => store.google.isSignedIn);
  const signInGoogle = useStoreActions((store) => store.google.signIn);
  const getBackupFile = useStoreActions((store => store.googleDriveBackup.getBackupFile));

  const setSyncEnabled = useStoreActions((state) => state.scheduledSync.setSyncEnabled);
  const changeScheduledSyncEnabled = useStoreActions((state) => state.settings.changeScheduledSyncEnabled);
  const changeAutopilotEnabled = useStoreActions((store) => store.settings.changeAutopilotEnabled);
  const setupAutopilot = useStoreActions((store) => store.lightning.setupAutopilot);

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
          const backupBase64 = await readFile(backupFile.uri, "base64");
          createWalletOpts.restore!.channelsBackup = backupBase64;
        }
      }
      else if (backupType === "google_drive") {
        createWalletOpts.restore!.channelsBackup = b64Backup!;
      }

      await createWallet(createWalletOpts),

      // TODO(hsjoberg) figure out if this should be done:
      await Promise.all([
        changeAutopilotEnabled(false),
        setupAutopilot(false),
        setSyncEnabled(true), // TODO test
        changeScheduledSyncEnabled(true),
      ]);
    } catch (e) {
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
      const base64Backup = await getBackupFile();
      console.log(base64Backup);
      setB64Backup(base64Backup);
      setBackupType("google_drive");
    } catch (e) {
      window.alert(`Restoring via Google Drive failed:\n\n${e.message}`);
    }
  };

  const pickChannelsExportFile = async () => {
    try {
      const res = await DocumentPicker.pick({
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
        translucent={false}
        networkActivityIndicatorVisible={true}
        barStyle="light-content"
      />
      <Content style={style.content}>
        <View style={style.upperContent}>
          <View style={style.seed}>
            <Textarea
              style={{width: "100%", height: 150, backgroundColor: blixtTheme.gray, fontSize: 20, }}
              rowSpan={6}
              bordered={false}
              underline={false}
              onChangeText={setSeedText}
              value={seedText}
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
                  <Button small onPress={googleDriveBackup}>
                    <Text>
                      Restore via Google Drive
                    </Text>
                  </Button>
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
      </Content>
    </Container>
  );
}

const style = StyleSheet.create({
  content: {
    width: "100%",
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  seed: {
    marginTop: 32,
    height: 300,
    flexDirection: "column",
    justifyContent: "center",
    alignContent: "center",
  },
  upperContent: {
    width: "100%",
    height: "100%",
  },
  buttons: {
    width: "100%",
    bottom: 24,
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
});

import React, { useState } from "react";
import { StatusBar, StyleSheet, Alert } from "react-native";
import DocumentPicker, { DocumentPickerResponse } from "react-native-document-picker";
import { readFile } from "react-native-fs";
import { Text, View, Button, H1, Textarea, Spinner } from "native-base";

import { useStoreActions } from "../../state/store";
import { NavigationScreenProp } from "react-navigation";
import { blixtTheme } from "../../../native-base-theme/variables/commonColor";
import Container from "../../components/Container";
import Content from "../../components/Content";
import { ICreateWalletPayload } from "../../state";

interface IProps {
  navigation: NavigationScreenProp<{}>;
}
export default ({ navigation }: IProps) => {
  const [loading, setLoading] = useState(false);
  const [seedText, setSeedText] = useState("");
  const [backupFile, setBackupFile] = useState<DocumentPickerResponse | null>(null);
  const setWalletSeed = useStoreActions((store) => store.setWalletSeed);
  const createWallet = useStoreActions((store) => store.createWallet);
  const setSyncEnabled = useStoreActions((state) => state.scheduledSync.setSyncEnabled);
  const changeScheduledSyncEnabled = useStoreActions((state) => state.settings.changeScheduledSyncEnabled);

  const changeAutopilotEnabled = useStoreActions((store) => store.settings.changeAutopilotEnabled);
  const setupAutopilot = useStoreActions((store) => store.lightning.setupAutopilot);

  const onRestorePress = async () => {
    try {
      console.log(seedText);
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
      if (backupFile) {
        const backupBase64 = await readFile(backupFile.uri, "base64");
        createWalletOpts.restore!.channelsBackup = backupBase64;
      }

      await createWallet(createWalletOpts),

      // TODO(hsjoberg) figure out if this should be done:
      await Promise.all([
        changeAutopilotEnabled(false),
        setupAutopilot(false),
        setSyncEnabled(true), // TODO test
        changeScheduledSyncEnabled(true),
      ]);
      navigation.navigate("InitLightning");
    } catch (e) {
      setLoading(false);
      Alert.alert(e.message);
    }
  };

  const pickChannelsExportFile = async () => {
    try {
      const res = await DocumentPicker.pick({
        type: [DocumentPicker.types.allFiles],
      });
      console.log(res);
      setBackupFile(res);
    } catch (e) {
      console.log(e);
    }
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
              style={{width: "100%", backgroundColor: blixtTheme.gray, fontSize: 20, }}
              rowSpan={7}
              bordered={false}
              underline={false}
              onChangeText={setSeedText}
              value={seedText}
            />
            <View style={{ marginTop: 6, width: "100%", display: "flex", flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
              <Text>{backupFile && backupFile.name}</Text>
              <Button small onPress={pickChannelsExportFile}>
                <Text>
                  {backupFile === null && "Choose channel backup file"}
                  {backupFile !== null && "Choose another file"}
                </Text>
              </Button>
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
    height: 200,
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

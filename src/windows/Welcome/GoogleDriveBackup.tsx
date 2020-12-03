import React from "react";
import { StatusBar, StyleSheet, } from "react-native";
import { Icon, Text, View, Button, H1 } from "native-base";
import { StackNavigationProp } from "@react-navigation/stack";

import { WelcomeStackParamList } from "./index";
import { useStoreState, useStoreActions } from "../../state/store";
import style from "./style";
import Container from "../../components/Container";

interface IProps {
  navigation: StackNavigationProp<WelcomeStackParamList, "GoogleDriveBackup">;
}
export default function GoogleDriveBackup({ navigation }: IProps) {
  const googleDriveBackupEnabled = useStoreState((store) => store.settings.googleDriveBackupEnabled);
  const changeGoogleDriveBackupEnabled = useStoreActions((store) => store.settings.changeGoogleDriveBackupEnabled);
  const googleSignIn = useStoreActions((store) => store.google.signIn);
  const googleDriveMakeBackup = useStoreActions((store) => store.googleDriveBackup.makeBackup);
  const googleIsSignedIn = useStoreState((store) => store.google.isSignedIn);
  const onPressGoogleDriveBackup = async () => {
    if (!googleIsSignedIn) {
      await googleSignIn();
      await googleDriveMakeBackup();
      await changeGoogleDriveBackupEnabled(true);
      // toast("Google Drive backup enabled");
    }
  };

  const onPressContinue = () => {
    navigation.replace("AlmostDone");
  };

  return (
    <Container>
      <StatusBar
        barStyle="light-content"
        hidden={false}
        backgroundColor="transparent"
        animated={true}
        translucent={true}
      />
      <View style={{ flex: 1, padding: 0 }}>
        <View style={[style.upperContent, { paddingTop: 40, justifyContent:"center" }]}>
          <View style={{ flexDirection: "row", justifyContent: "center"}}>
            {!googleDriveBackupEnabled &&
              <Button  bordered light onPress={onPressGoogleDriveBackup}>
                <Icon type="Entypo" name="google-drive" />
                <Text style={{ paddingLeft: 0 }}>Enable Google Drive backup</Text>
              </Button>
            }
            {googleDriveBackupEnabled &&
              <Text>Google Drive backup enabled</Text>
            }
          </View>
        </View>
        <View style={style.lowerContent}>
          <View style={style.text}>
            <H1 style={style.textHeader}>Cloud Backup</H1>
            <Text>
              In order for your off-chain funds to stay secure in the case of a device loss,
              we recommend you to keep channels backed up to Google Drive.{"\n\n"}
              This will keep an encrypted backup of your channels that can only be used together with the wallet seed.{"\n\n"}
              When you are ready, press continue.
            </Text>
          </View>
          <View style={style.buttons}>
            <Button style={style.button} block={true} onPress={onPressContinue}>
              <Text>Continue</Text>
            </Button>
          </View>
        </View>
      </View>
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

import React from "react";
import { StatusBar } from "react-native";
import { Icon, Text, View, Button, H1 } from "native-base";
import { StackNavigationProp } from "@react-navigation/stack";

import { WelcomeStackParamList } from "./index";
import { useStoreState, useStoreActions } from "../../state/store";
import style from "./style";
import Container from "../../components/Container";

import { useTranslation } from "react-i18next";
import { namespaces } from "../../i18n/i18n.constants";

interface IProps {
  navigation: StackNavigationProp<WelcomeStackParamList, "GoogleDriveBackup">;
}
export default function GoogleDriveBackup({ navigation }: IProps) {
  const t = useTranslation(namespaces.welcome.googleDriveBackup).t;
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
              <Button bordered light onPress={onPressGoogleDriveBackup}>
                <Icon type="Entypo" name="google-drive" />
                <Text style={{ paddingLeft: 0 }}>{t("enable.title")}</Text>
              </Button>
            }
            {googleDriveBackupEnabled &&
              <Text>{t("enable.msg")}</Text>
            }
          </View>
        </View>
        <View style={style.lowerContent}>
          <View style={style.text}>
            <H1 style={style.textHeader}>{t("backup.title")}</H1>
            <Text>
              {t("backup.msg")}{"\n\n"}
              {t("backup.msg1")}{"\n\n"}
              {t("backup.msg2")}
            </Text>
          </View>
          <View style={style.buttons}>
            <Button style={style.button} block={true} onPress={onPressContinue}>
              <Text>{t("buttons.continue",{ns:namespaces.common})}</Text>
            </Button>
          </View>
        </View>
      </View>
    </Container>
  );
}

import React from "react";
import { StatusBar } from "react-native";
import { Icon, Text, View, H1 } from "native-base";
import { Button } from "../../components/Button";
import { StackNavigationProp } from "@react-navigation/stack";

import { WelcomeStackParamList } from "./index";
import { useStoreState, useStoreActions } from "../../state/store";
import style from "./style";
import Container from "../../components/Container";

import { useTranslation } from "react-i18next";
import { namespaces } from "../../i18n/i18n.constants";

interface IProps {
  navigation: StackNavigationProp<WelcomeStackParamList, "ICloudBackup">;
}
export default function ICloudBackup({ navigation }: IProps) {
  const t = useTranslation(namespaces.welcome.iCloudBackup).t;
  const iCloudBackupEnabled = useStoreState((store) => store.settings.iCloudBackupEnabled);
  const changeICloudBackupEnabled = useStoreActions((store) => store.settings.changeICloudBackupEnabled);
  const iCloudMakeBackup = useStoreActions((store) => store.iCloudBackup.makeBackup);
  const onPressICloudBackup = async () => {
    await iCloudMakeBackup();
    await changeICloudBackupEnabled(true);
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
        <View style={[style.upperContent, { paddingTop: 40, justifyContent: "center" }]}>
          <View style={{ flexDirection: "row", justifyContent: "center" }}>
            {!iCloudBackupEnabled &&
              <Button bordered light onPress={onPressICloudBackup}>
                <Icon type="MaterialCommunityIcons" name="apple-icloud" />
                <Text style={{ paddingLeft: 0, textTransform: "none" }}>{t("enable.title")}</Text>
              </Button>
            }
            {iCloudBackupEnabled &&
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

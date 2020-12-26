import React from "react";
import { StatusBar, StyleSheet, } from "react-native";
import { Icon, Text, View, Button, H1 } from "native-base";
import { StackNavigationProp } from "@react-navigation/stack";

import { WelcomeStackParamList } from "./index";
import { useStoreState, useStoreActions } from "../../state/store";
import style from "./style";
import Container from "../../components/Container";

interface IProps {
  navigation: StackNavigationProp<WelcomeStackParamList, "ICloudBackup">;
}
export default function ICloudBackup({ navigation }: IProps) {
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
        <View style={[style.upperContent, { paddingTop: 40, justifyContent:"center" }]}>
          <View style={{ flexDirection: "row", justifyContent: "center"}}>
            {!iCloudBackupEnabled &&
              <Button bordered light onPress={onPressICloudBackup}>
                <Icon type="MaterialCommunityIcons" name="apple-icloud" />
                <Text style={{ paddingLeft: 0, textTransform: "none" }}>Enable iCloud backup</Text>
              </Button>
            }
            {iCloudBackupEnabled &&
              <Text>iCloud backup enabled</Text>
            }
          </View>
        </View>
        <View style={style.lowerContent}>
          <View style={style.text}>
            <H1 style={style.textHeader}>iCloud Backup</H1>
            <Text>
              In order for your off-chain funds to stay secure in the case of a device loss,
              we recommend you to keep channels backed up to iCloud.{"\n\n"}
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

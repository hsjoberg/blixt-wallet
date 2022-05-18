import React, { useState } from "react";
import { StyleSheet, StatusBar, NativeModules, SafeAreaView } from "react-native";
import { Text, H1, Button, View, Spinner, Icon } from "native-base";
import { useStoreActions, useStoreState } from "../../state/store";
import * as Animatable from "react-native-animatable";
import { Menu, MenuItem } from "react-native-material-menu";
import { CommonActions } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";

import { WelcomeStackParamList } from "./index";
import Container from "../../components/Container";
import { blixtTheme } from "../../native-base-theme/variables/commonColor";
import { PLATFORM } from "../../utils/constants";
import { getStatusBarHeight } from "react-native-status-bar-height";

import { useTranslation } from "react-i18next";
import { namespaces } from "../../i18n/i18n.constants";
import { toast } from "../../utils";
import { Alert } from "../../utils/alert";

interface IAnimatedH1Props {
  children: JSX.Element | string;
}
function AnimatedH1({ children }: IAnimatedH1Props) {
  return (
    <Animatable.View duration={650} animation="fadeInDown">
      <H1 style={style.header}>
        {children}
      </H1>
    </Animatable.View>
  );
};

interface IAnimatedViewProps {
  children: JSX.Element[];
}
function AnimatedView({ children }: IAnimatedViewProps) {
  return (
    <Animatable.View duration={660} style={style.buttons} animation="fadeInUp">
      {children}
    </Animatable.View>
  );
}

function TopMenu() {
  const t = useTranslation(namespaces.welcome.start).t;
  const torEnabled = useStoreState((store) => store.torEnabled);
  const changeTorEnabled = useStoreActions((store) => store.settings.changeTorEnabled);
  const neutrinoPeers = useStoreState((store) => store.settings.neutrinoPeers);
  const changeNeutrinoPeers = useStoreActions((store) => store.settings.changeNeutrinoPeers);
  const writeConfig = useStoreActions((store) => store.writeConfig);
  const [visible, setVisible] = useState(false);
  const hideMenu = () => setVisible(false);
  const showMenu = () => setVisible(true);

  const toggleTorEnabled = async () => {
    changeTorEnabled(!torEnabled);
    setVisible(false);
    if (PLATFORM === "android") {
      try {
        // await NativeModules.LndMobile.stopLnd();
        await NativeModules.LndMobileTools.killLnd();
      } catch(e) {
        console.log(e);
      }
      NativeModules.LndMobileTools.restartApp();
    } else {
      const title = "Restart required";
      const message = "Blixt Wallet has to be restarted before the new configuration is applied."
      Alert.alert(title, message);
    }
  };

  const onSetBitcoinNodePress = async () => {
    Alert.prompt(
      t("bitcoinNetwork.node.setDialog.title", { ns: namespaces.settings.settings }),
      t("bitcoinNetwork.node.setDialog.info", { ns: namespaces.settings.settings }) + "\n\n" +
      t("bitcoinNetwork.node.setDialog.leaveBlankToSearch", { ns: namespaces.settings.settings }),
      [{
        text: t("buttons.cancel", { ns:namespaces.common }),
        style: "cancel",
        onPress: () => {},
      }, {
        text: t("bitcoinNetwork.node.setDialog.title", { ns: namespaces.settings.settings }),
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

  const restartNeeded = () => {
    const title = t("bitcoinNetwork.restartDialog.title", { ns: namespaces.settings.settings });
    const message = t("bitcoinNetwork.restartDialog.msg", { ns: namespaces.settings.settings });
    if (PLATFORM === "android") {
      Alert.alert(
        title,
        message + "\n" + t("bitcoinNetwork.restartDialog.msg1", { ns: namespaces.settings.settings }),
        [{
          style: "cancel",
          text: t("buttons.no",{ ns:namespaces.common }),
        }, {
          style: "default",
          text: t("buttons.yes",{ ns:namespaces.common }),
          onPress: async () => {
            try {
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

  return (
    <View style={style.menuDotsIcon}>
      <Menu
        visible={visible}
        onRequestClose={hideMenu}
        anchor={
          <Icon
            type="Entypo"
            name="dots-three-horizontal"
            onPress={showMenu}
          />
        }
      >
        <MenuItem onPress={toggleTorEnabled} textStyle={{ color: "#000" }}>
          {torEnabled ? t("menu.disableTor") : t("menu.enableTor")}
        </MenuItem>
        <MenuItem onPress={onSetBitcoinNodePress} textStyle={{ color: "#000" }}>
          {t("menu.setBitcoinNode")}
        </MenuItem>
      </Menu>
    </View>
  );
}

export interface IStartProps {
  navigation: StackNavigationProp<WelcomeStackParamList, "Start">;
}
export default function Start({ navigation }: IStartProps) {
  const t = useTranslation(namespaces.welcome.start).t;
  const generateSeed = useStoreActions((store) => store.generateSeed);
  const createWallet = useStoreActions((store) => store.createWallet);
  const setSyncEnabled = useStoreActions((state) => state.scheduledSync.setSyncEnabled);
  const changeScheduledSyncEnabled = useStoreActions((state) => state.settings.changeScheduledSyncEnabled);
  const [createWalletLoading, setCreateWalletLoading] = useState(false);

  const onCreateWalletPress = async () => {
    try {
      await generateSeed(undefined);
      Alert.alert(
        t("msg.warning",{ns:namespaces.common}),
`${t("createWallet.msg1")}

${t("createWallet.msg2")}

${t("createWallet.msg3")}`,
        [{
          text: t("createWallet.msg4"),
          onPress: async  () => {
            try {
              setCreateWalletLoading(true);
              await createWallet();
              await setSyncEnabled(true); // TODO test
              await changeScheduledSyncEnabled(true);

              navigation.dispatch(
                CommonActions.reset({
                  index: 0,
                  routes: [
                    { name: "Loading" },
                  ],
                })
              );
            } catch (error) {
              toast(error.message, undefined, "danger");
              setCreateWalletLoading(false);
            }
          }
        }],
      );
    } catch (e) {
      Alert.alert(e.message);
    }
  };

  const onRestoreWalletPress = async () => {
    navigation.navigate("Restore");
  };

  return (
    <Container>
      <SafeAreaView style={style.content}>
        <StatusBar
          backgroundColor="transparent"
          hidden={false}
          translucent={true}
          networkActivityIndicatorVisible={true}
          barStyle="light-content"
        />

        {(!createWalletLoading && PLATFORM !== "macos") &&  (
          <TopMenu />
        )}

        {!createWalletLoading
          ? <AnimatedH1>{t("title")}</AnimatedH1>
          : <H1 style={style.header}>{t("title")}</H1>
        }
        {!createWalletLoading
          ?
            <AnimatedView>
              <Button style={style.button} onPress={onCreateWalletPress}>
                {!createWalletLoading && <Text>{t("createWallet.title")}</Text>}
                {createWalletLoading && <Spinner color={blixtTheme.light} />}
              </Button>
              <Button style={style.button} onPress={onRestoreWalletPress}>
                <Text>{t("restoreWallet.title")}</Text>
              </Button>
            </AnimatedView>
          :
            <Spinner color={blixtTheme.light} />
        }
      </SafeAreaView>
    </Container>
  );
};

const iconTopPadding = (StatusBar.currentHeight ?? 0) + getStatusBarHeight(true);

const style = StyleSheet.create({
  content: {
    flex: 1,
    width: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  header: {
    fontSize: 38,
    lineHeight: 42,
  },
  buttons: {
    flexDirection: "row",
    alignSelf: "center",
    margin: 10,
  },
  button: {
    margin: 8,
  },
  menuDotsIcon: {
    position: "absolute",
    top: iconTopPadding + 16,
    right: 24,
  },
});

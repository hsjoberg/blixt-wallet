import React, { useState } from "react";
import { StyleSheet, StatusBar, NativeModules, SafeAreaView, Platform } from "react-native";
import DialogAndroid from "react-native-dialogs";
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
import { languages, namespaces } from "../../i18n/i18n.constants";
import { toast } from "../../utils";
import { Alert } from "../../utils/alert";

interface IAnimatedH1Props {
  children: JSX.Element | string;
}
function AnimatedH1({ children }: IAnimatedH1Props) {
  return (
    <Animatable.View duration={650} animation="fadeInDown">
      <H1 style={style.header}>{children}</H1>
    </Animatable.View>
  );
}

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

function TopMenu({ navigation, setCreateWalletLoading }: IStartProps) {
  const t = useTranslation(namespaces.welcome.start).t;
  const torEnabled = useStoreState((store) => store.torEnabled);
  const changeTorEnabled = useStoreActions((store) => store.settings.changeTorEnabled);
  const neutrinoPeers = useStoreState((store) => store.settings.neutrinoPeers);
  const changeNeutrinoPeers = useStoreActions((store) => store.settings.changeNeutrinoPeers);
  const writeConfig = useStoreActions((store) => store.writeConfig);
  const changeLanguage = useStoreActions((store) => store.settings.changeLanguage);
  const currentLanguage = useStoreState((store) => store.settings.language);
  const generateSeed = useStoreActions((store) => store.generateSeed);
  const createWallet = useStoreActions((store) => store.createWallet);
  const setSyncEnabled = useStoreActions((state) => state.scheduledSync.setSyncEnabled);
  const changeScheduledSyncEnabled = useStoreActions((state) => state.settings.changeScheduledSyncEnabled);
  const [visible, setVisible] = useState(false);
  const hideMenu = () => setVisible(false);
  const showMenu = () => setVisible(true);


  const onCreateWalletWithPassphrasePress = async () => {
    Alert.alert(
      t("msg.warning", { ns: namespaces.common }),
      `${t("createWallet.msg1")}
  
      ${t("createWallet.msg2")}
  
      ${t("createWallet.msg3")}`,
      [
        {
          text: t("createWallet.msg4"),
          onPress: async () => {
              Alert.prompt(
                t("createWalletWithPassphrase.title"),
                "",
                [
                  {
                    text: t("buttons.cancel", { ns: namespaces.common }),
                    style: "cancel",
                    onPress: () => {},
                  },
                  {
                    text: t("general.name.dialog.accept", { ns: namespaces.settings.settings }),
                    onPress: async (text) => {
                      try {
                        if (!text || text.trim().length === 0) {
                          toast(t("createWalletWithPassphrase.invalidMessage"), undefined, "danger");
                          return;
                        }

                        const hasLeadingTrailingSpaces = text.trim() !== text;

                        if (!!hasLeadingTrailingSpaces) {
                          toast(t("createWalletWithPassphrase.noLeadingTrailingSpaces"), undefined, "danger");
                          return;
                        }

                        await generateSeed(text.trim());
                        setCreateWalletLoading(true);
                        await createWallet({init: {aezeedPassphrase: text || undefined}});
                        await setSyncEnabled(true); // TODO test
                        await changeScheduledSyncEnabled(true);
        
                        navigation.dispatch(
                          CommonActions.reset({
                            index: 0,
                            routes: [{ name: "Loading" }],
                          })
                        );
                      } catch (error) {
                        toast(error.message, undefined, "danger");
                        setCreateWalletLoading(false);
                      }
                    },
                  }
                ]
              );
            },
          },
        ]
    );
  }

  const toggleTorEnabled = async () => {
    changeTorEnabled(!torEnabled);
    setVisible(false);
    if (PLATFORM === "android") {
      try {
        // await NativeModules.LndMobile.stopLnd();
        await NativeModules.LndMobileTools.killLnd();
      } catch (e) {
        console.log(e);
      }
      NativeModules.LndMobileTools.restartApp();
    } else {
      const title = "Restart required";
      const message = "Blixt Wallet has to be restarted before the new configuration is applied.";
      Alert.alert(title, message);
    }
  };

  const onSetBitcoinNodePress = async () => {
    setVisible(false);
    Alert.prompt(
      t("bitcoinNetwork.node.setDialog.title", { ns: namespaces.settings.settings }),
      t("bitcoinNetwork.node.setDialog.info", { ns: namespaces.settings.settings }) +
        "\n\n" +
        t("bitcoinNetwork.node.setDialog.leaveBlankToSearch", { ns: namespaces.settings.settings }),
      [
        {
          text: t("buttons.cancel", { ns: namespaces.common }),
          style: "cancel",
          onPress: () => {},
        },
        {
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
        },
      ],
      "plain-text",
      neutrinoPeers[0] ?? ""
    );
  };

  const restartNeeded = () => {
    const title = t("bitcoinNetwork.restartDialog.title", { ns: namespaces.settings.settings });
    const message = t("bitcoinNetwork.restartDialog.msg", { ns: namespaces.settings.settings });
    if (PLATFORM === "android") {
      Alert.alert(title, message + "\n" + t("bitcoinNetwork.restartDialog.msg1", { ns: namespaces.settings.settings }), [
        {
          style: "cancel",
          text: t("buttons.no", { ns: namespaces.common }),
        },
        {
          style: "default",
          text: t("buttons.yes", { ns: namespaces.common }),
          onPress: async () => {
            try {
              await NativeModules.LndMobile.stopLnd();
              await NativeModules.LndMobileTools.killLnd();
            } catch (e) {
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

  const onLanguageChange = async () => {
    setVisible(false);
    if (PLATFORM === "android") {
      const { selectedItem } = await DialogAndroid.showPicker(null, null, {
        positiveText: null,
        negativeText: t("buttons.cancel", { ns: namespaces.common }),
        type: DialogAndroid.listRadio,
        selectedId: currentLanguage,
        items: Object.keys(languages)
          .sort()
          .map((key) => {
            return {
              label: languages[key].name,
              id: languages[key].id,
            };
          }),
      });
      if (selectedItem) {
        await changeLanguage(selectedItem.id);
      }
    } else {
      navigation.navigate("ChangeLanguage", {
        title: t("language.title"),
        data: Object.keys(languages)
          .sort()
          .map((key) => {
            return {
              title: languages[key].name,
              value: languages[key].id,
            };
          }),
        onPick: async (lang: string) => {
          await changeLanguage(lang);
        },
      });
    }
  };

  const onPressDots = () => {
    if (PLATFORM !== "macos" && PLATFORM !== "web") {
      showMenu();
      return;
    }

    navigation.navigate("Settings", {
      title: "",
      description: "",
      data: [{
        title: t("menu.setBitcoinNode"),
        value: "setBitcoinNode",
      }, {
        title: t("language.title"),
        value: "setLanguage",
      }, {
        title: t("menu.createWalletWithPassphrase"),
        value: "createWalletWithPassphrase"
      }],
      onPick: async (setting) => {
        console.log(setting);
        if (setting === "setBitcoinNode") {
          onSetBitcoinNodePress();
        } else if (setting === "setLanguage") {
          onLanguageChange();
        } else if (setting === "createWalletWithPassphrase") {
          onCreateWalletWithPassphrasePress();
        }
      },
    });

  }

  return (
    <View style={style.menuDotsIcon}>
      <Menu visible={visible} onRequestClose={hideMenu} anchor={<Icon type="Entypo" name="dots-three-horizontal" onPress={onPressDots} />}>
        {PLATFORM !== "macos" && (
          <MenuItem onPress={toggleTorEnabled} textStyle={{ color: "#000" }}>
            {torEnabled ? t("menu.disableTor") : t("menu.enableTor")}
          </MenuItem>
        )}
        <MenuItem onPress={onSetBitcoinNodePress} textStyle={{ color: "#000" }}>
          {t("menu.setBitcoinNode")}
        </MenuItem>
        <MenuItem onPress={onLanguageChange} textStyle={{ color: "#000" }}>
          {t("language.title")}
        </MenuItem>
        <MenuItem onPress={onCreateWalletWithPassphrasePress} textStyle={{ color: "#000" }}>
          {t("menu.createWalletWithPassphrase")}
        </MenuItem>
      </Menu>
    </View>
  );
}

export interface IStartProps {
  navigation: StackNavigationProp<WelcomeStackParamList, "Start">;
  setCreateWalletLoading: (loading: boolean) => void;
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
        t("msg.warning", { ns: namespaces.common }),
        `${t("createWallet.msg1")}

${t("createWallet.msg2")}

${t("createWallet.msg3")}`,
        [
          {
            text: t("createWallet.msg4"),
            onPress: async () => {
              try {
                setCreateWalletLoading(true);
                await createWallet();
                await setSyncEnabled(true); // TODO test
                await changeScheduledSyncEnabled(true);

                navigation.dispatch(
                  CommonActions.reset({
                    index: 0,
                    routes: [{ name: "Loading" }],
                  })
                );
              } catch (error) {
                toast(error.message, undefined, "danger");
                setCreateWalletLoading(false);
              }
            },
          },
        ]
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
        <StatusBar backgroundColor="transparent" hidden={false} translucent={true} networkActivityIndicatorVisible={true} barStyle="light-content" />

        {!createWalletLoading && <TopMenu navigation={navigation} setCreateWalletLoading={setCreateWalletLoading} />}

        {!createWalletLoading ? <AnimatedH1>{t("title")}</AnimatedH1> : <H1 style={style.header}>{t("title")}</H1>}
        {!createWalletLoading ? (
          <>
            <AnimatedView>
              <Button style={style.button} onPress={onCreateWalletPress}>
                {!createWalletLoading && <Text>{t("createWallet.title")}</Text>}
                {createWalletLoading && <Spinner color={blixtTheme.light} />}
              </Button>
              <Button style={style.button} onPress={onRestoreWalletPress}>
                <Text>{t("restoreWallet.title")}</Text>
              </Button>
            </AnimatedView>
          </>
        ) : (
          <Spinner color={blixtTheme.light} />
        )}
      </SafeAreaView>
    </Container>
  );
}

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
  languageButton: {
    position: "absolute",
    top: iconTopPadding + 16,
    left: 24,
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

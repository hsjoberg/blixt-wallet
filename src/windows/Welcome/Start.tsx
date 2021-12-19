import React, { useState, useRef } from "react";
import { StyleSheet, StatusBar, Alert, NativeModules } from "react-native";
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

import { useTranslation, TFunction } from "react-i18next";
import { namespaces } from "../../i18n/i18n.constants";

let t:TFunction;

interface IAnimatedH1Props {
  children: JSX.Element | string;
}
function AnimatedH1({ children }: IAnimatedH1Props) {
  const AnimH1 = Animatable.createAnimatableComponent(H1);
  return (
    <AnimH1 style={style.header} duration={650} animation="fadeInDown" useNativeDriver={true}>
      {children}
    </AnimH1>
  );
};

interface IAnimatedViewProps {
  children: JSX.Element[];
}
function AnimatedView({ children }: IAnimatedViewProps) {
  return (
    <Animatable.View duration={660} style={style.buttons} animation="fadeInUp" useNativeDriver={true}>
      {children}
    </Animatable.View>
  );
}

function TopMenu() {
  const torEnabled = useStoreState((store) => store.torEnabled);
  const changeTorEnabled = useStoreActions((store) => store.settings.changeTorEnabled);
  const [visible, setVisible] = useState(false);
  const hideMenu = () => setVisible(false);
  const showMenu = () => setVisible(true);

  const toggleTorEnabled = async () => {
    changeTorEnabled(!torEnabled);
    setVisible(false);
    // menu.current.hide();
    try {
      // await NativeModules.LndMobile.stopLnd();
      await NativeModules.LndMobileTools.killLnd();
    } catch(e) {
      console.log(e);
    }
    NativeModules.LndMobileTools.restartApp();
  }

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
        <MenuItem
          onPress={toggleTorEnabled}
          // style={{ backgroundColor: blixtTheme.gray }}
          // textStyle={{ color: blixtTheme.light }}
          textStyle={{ color: "#000" }}
        >
          {torEnabled ? "Disable" : "Enable"} Tor
        </MenuItem>
      </Menu>
    </View>
  );
}

export interface IStartProps {
  navigation: StackNavigationProp<WelcomeStackParamList, "Start">;
}
export default function Start({ navigation }: IStartProps) {
  t = useTranslation(namespaces.welcome.start).t;
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
          }
        }],
      );
    } catch (e:any) {
      Alert.alert(e.message);
    }
  };

  const onRestoreWalletPress = async () => {
    navigation.navigate("Restore");
  };

  return (
    <Container>
      <View style={style.content}>
        <StatusBar
          backgroundColor="transparent"
          hidden={false}
          translucent={true}
          networkActivityIndicatorVisible={true}
          barStyle="light-content"
        />
        {(!createWalletLoading && PLATFORM === "android") &&
          <TopMenu />
        }
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
      </View>
    </Container>
  );
};

const iconTopPadding = StatusBar.currentHeight ?? 0;

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

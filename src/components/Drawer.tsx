import React from "react";
import { PixelRatio, StyleSheet, TouchableOpacity, View, ScrollView } from "react-native";
import Clipboard from "@react-native-community/clipboard";
import { Icon, Text } from "native-base";
import { DrawerActions, useNavigation } from "@react-navigation/native";

import { blixtTheme } from "../native-base-theme/variables/commonColor";
import { SafeAreaView } from "react-native-safe-area-context";
import { BlixtLogo } from "./BlixtWallet";
import usePromptLightningAddress  from "../hooks/usePromptLightningAddress";
import useEvaluateLightningCode  from "../hooks/useEvaluateLightningCode";
import { fontFactorNormalized } from "../utils/scale";

export default function Drawer() {
  const navigation = useNavigation();
  const promptLightningAddress = usePromptLightningAddress();
  const evaluateLightningCode = useEvaluateLightningCode();

  const goToScreen = (screen: string, options: any = undefined, delayDrawerClose = true) => {
    setTimeout(
      () => navigation.dispatch(DrawerActions.closeDrawer),
      delayDrawerClose ? 500 : 1,
    );
    navigation.navigate(screen, options);
  };

  const sendToLightningAddress = async () => {
    navigation.dispatch(DrawerActions.closeDrawer);
    if (await promptLightningAddress()) {
      navigation.navigate("LNURL", { screen: "PayRequest" });
    } else {
      navigation.dispatch(DrawerActions.openDrawer);
    }
  };

  const pasteFromClipboard = async () => {
    const clipboardText = await Clipboard.getString()
    switch (await evaluateLightningCode(clipboardText,  "Clipboard paste error")) {
      case "BOLT11":
        goToScreen("Send", { screen: "SendConfirmation" });
      break;
      case "LNURLAuthRequest":
        goToScreen("LNURL", { screen: "AuthRequest" }, false);
      break;
      case "LNURLChannelRequest":
        goToScreen("LNURL", { screen: "ChannelRequest" });
      break;
      case "LNURLPayRequest":
        goToScreen("LNURL", { screen: "PayRequest" }, false);
      break;
      case "LNURLWithdrawRequest":
        goToScreen("LNURL", { screen: "WithdrawRequest" }, false);
      break;
      case null:
      break;
    }
  };

  const goToLightningBrowser = () => {
    setTimeout(
      () => navigation.navigate("WebLNBrowser"),
      270,
    );
    navigation.dispatch(DrawerActions.closeDrawer);
  }

  return (
    <SafeAreaView style={style.drawerContainer}>
      <ScrollView style={style.drawerScroll} alwaysBounceVertical={false}>
        <View style={style.logoContainer}>
          <BlixtLogo />
          <Text style={style.blixtTitle}>Blixt Wallet</Text>
        </View>
        <View style={style.menu}>
          {/* <TouchableOpacity onPress={() => goToScreen("Send")}>
            <View style={style.menuItem}>
              <Icon style={style.menuItemIcon} type="AntDesign" name="camerao" />
              <Text style={style.menuItemText}>Scan</Text>
            </View>
          </TouchableOpacity> */}

          {/* <TouchableOpacity onPress={() => goToScreen("Receive")}>
            <View style={style.menuItem}>
              <Icon style={style.menuItemIcon} type="AntDesign" name="qrcode" />
              <Text style={style.menuItemText}>Receive</Text>
            </View>
          </TouchableOpacity> */}

          <TouchableOpacity onPress={pasteFromClipboard}>
            <View style={style.menuItem}>
              <Icon style={style.menuItemIcon} type="FontAwesome5" name="paste" />
              <Text style={style.menuItemText}>Paste from Clipboard</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity onPress={sendToLightningAddress}>
            <View style={style.menuItem}>
              <Icon style={style.menuItemIcon} type="Ionicons" name="at" />
              <Text style={style.menuItemText}>Send to Lightning Address</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity onPress={goToLightningBrowser}>
            <View style={style.menuItem}>
              <Icon style={style.menuItemIcon} type="MaterialCommunityIcons" name="web" />
              <Text style={style.menuItemText}>Lightning Browser</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => goToScreen("OnChain")}>
            <View style={style.menuItem}>
              <Icon style={style.menuItemIcon} type="MaterialCommunityIcons" name="bitcoin" />
              <Text style={style.menuItemText}>On-chain</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => goToScreen("LightningInfo")}>
            <View style={style.menuItem}>
              <Icon style={style.menuItemIcon} type="Entypo" name="thunder-cloud" />
              <Text style={style.menuItemText}>Lightning Channels</Text>
            </View>
          </TouchableOpacity>
        </View>
      </ScrollView>
      <View style={style.bottom}>
        <Text style={style.bottomText} note>Made with ⚡ in Sweden</Text>
      </View>
    </SafeAreaView>
  );
};

const style = StyleSheet.create({
  drawerContainer: {
    flex: 1,
    backgroundColor: blixtTheme.dark,
  },
  drawerScroll: {
    flex: 1,
  },
  logoContainer: {
    paddingTop: 28,
    paddingBottom: 13,
    alignItems: "center",
  },
  blixtTitle: {
    marginTop: 6,
    fontFamily: blixtTheme.fontMedium,
    fontSize: 33 / PixelRatio.getFontScale(),
  },
  menu: {
    marginTop: 10,
    flex: 1,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: blixtTheme.gray,
    padding: 13,
    marginHorizontal: 19,
    marginBottom: 11,
    borderRadius: 12,
  },
  menuItemIcon: {
    width: 32,
    marginRight: 11,
  },
  menuItemText: {
    fontFamily: blixtTheme.fontMedium,
    fontSize: 15 * fontFactorNormalized,
  },
  bottom: {
    backgroundColor: blixtTheme.dark,
    paddingTop: 10,
    paddingBottom: 11,
    flexDirection: "column-reverse",
    alignItems: "center",
  },
  bottomText: {
    fontSize: 12.5 * fontFactorNormalized,
  },
});

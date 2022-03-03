import React, { useState } from "react";
import { PixelRatio, StyleSheet, TouchableOpacity, View, ScrollView, LayoutAnimation } from "react-native";
import Clipboard from "@react-native-community/clipboard";
import { Icon, Text } from "native-base";
import { DrawerActions, useNavigation } from "@react-navigation/native";

import { blixtTheme } from "../native-base-theme/variables/commonColor";
import { BlixtLogo } from "./BlixtWallet";
import usePromptLightningAddress from "../hooks/usePromptLightningAddress";
import useEvaluateLightningCode from "../hooks/useEvaluateLightningCode";
import { fontFactorNormalized } from "../utils/scale";
import useLayoutMode from "../hooks/useLayoutMode";
import { useStoreState } from "../state/store";

export default function Drawer() {
  const navigation = useNavigation();
  const promptLightningAddress = usePromptLightningAddress();
  const evaluateLightningCode = useEvaluateLightningCode();
  const layoutMode = useLayoutMode();
  const [expandAdvanced, setExpandAdvanced] = useState(false);
  const channels = useStoreState((store) => store.channel.channels);
  const syncedToChain = useStoreState((store) => store.lightning.syncedToChain);

  const closeDrawer = () => {
    navigation.dispatch(DrawerActions.closeDrawer);
    setExpandAdvanced(false);
  };

  const goToScreen = (screen: string, options: any = undefined, delayDrawerClose = true) => {
    setTimeout(closeDrawer, delayDrawerClose ? 600 : 1);
    navigation.navigate(screen, options);
  };

  const sendToLightningAddress = async () => {
    navigation.dispatch(DrawerActions.closeDrawer);
    if ((await promptLightningAddress())[0]) {
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

  const toggleAdvanced = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandAdvanced(!expandAdvanced);
  };

  let statusIndicatorColor = blixtTheme.red;
  if (syncedToChain && channels.length > 0) {
    if (channels.some((channel) => channel.active)) {
      statusIndicatorColor = blixtTheme.green;
    } else {
      statusIndicatorColor = blixtTheme.primary;
    }
  }

  return (
    <View style={style.drawerContainer}>
      <ScrollView style={style.drawerScroll} alwaysBounceVertical={false}>
        <View style={style.logoContainer}>
          <BlixtLogo />
          <Text style={style.blixtTitle} onPress={() => goToScreen("SyncInfo", undefined, false)}>Blixt Wallet</Text>
          <View style={[{
            backgroundColor: statusIndicatorColor,
          }, style.statusIndicator]}></View>
        </View>
        <View style={style.menu}>
          {layoutMode === "full" && (
            <>
              <TouchableOpacity onPress={() => goToScreen("Send")}>
                <View style={style.menuItem}>
                  <Icon style={style.menuItemIcon} type="AntDesign" name="camerao" />
                  <Text style={style.menuItemText}>Scan</Text>
                </View>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => goToScreen("Receive")}>
                <View style={style.menuItem}>
                  <Icon style={style.menuItemIcon} type="AntDesign" name="qrcode" />
                  <Text style={style.menuItemText}>Receive</Text>
                </View>
              </TouchableOpacity>
            </>
          )}

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

          <TouchableOpacity onPress={() => goToScreen("Contacts")}>
            <View style={style.menuItem}>
              <Icon style={style.menuItemIcon} type="AntDesign" name="contacts" />
              <Text style={style.menuItemText}>Contacts &amp; Services</Text>
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

          <TouchableOpacity onPress={toggleAdvanced}>
            <View style={style.advancedExpand}>
              <Text note style={style.advancedExpandText}>Advanced</Text>
              <Icon style={style.advancedExpandIcon} type="AntDesign" name={expandAdvanced ? "up" : "down"} />
            </View>
          </TouchableOpacity>

          <View style={[{height: expandAdvanced ? "auto" : 0 }, style.advanced]}>
            <TouchableOpacity onPress={() => goToScreen("KeysendExperiment")}>
              <View style={style.menuItem}>
                <Icon style={[style.menuItemIcon, { fontSize: 25 }]} color={blixtTheme.dark} type="FontAwesome" name="send" />
                <Text style={style.menuItemText}>Keysend Experiment</Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
      <View style={style.bottom}>
        <Text style={style.bottomText} note>Made with ⚡ in Sweden</Text>
      </View>
    </View>
  );
};

const style = StyleSheet.create({
  drawerContainer: {
    flex: 1,
    width: "100%",
    backgroundColor: blixtTheme.dark,
  },
  drawerScroll: {
    flex: 1,
    paddingTop: 34,
  },
  logoContainer: {
    paddingTop: 22,
    paddingBottom: 10,
    alignItems: "center",
  },
  blixtTitle: {
    marginTop: 3,
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
    paddingVertical: 11,
    paddingHorizontal: 13,
    marginHorizontal: 19,
    marginBottom: 11,
    borderRadius: 12,
  },
  advancedExpand: {
    padding: 13,
    marginHorizontal: 19,
    marginTop: -9,
    marginBottom: 3,
    borderRadius: 12,
    flexDirection:"row",

    justifyContent: "center",
    alignItems: "center",
  },
  advancedExpandText: {
  },
  advancedExpandIcon: {
    fontSize: 16,
    marginLeft: 5,
    marginTop: 3,
  },
  advanced: {
    overflow: "hidden",
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
    paddingBottom: 20,
    flexDirection: "column-reverse",
    alignItems: "center",
  },
  bottomText: {
    fontSize: 12.5 * fontFactorNormalized,
  },
  statusIndicator: {
    width: 7,
    height: 7,
    borderRadius: 8,
    position: "absolute",
    top: 17,
    right: 18,
  }
});

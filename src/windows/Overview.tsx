import React, { useState, useRef, useMemo } from "react";
import { Animated, StyleSheet, View, ScrollView, StatusBar, Easing, RefreshControl, NativeSyntheticEvent, NativeScrollEvent } from "react-native";
import Clipboard from "@react-native-community/clipboard";
import { Icon, Text, Card, CardItem, Spinner as NativeBaseSpinner, Button } from "native-base";
import { useNavigation } from "@react-navigation/native";
import { createMaterialTopTabNavigator } from "@react-navigation/material-top-tabs";
import { createBottomTabNavigator, BottomTabNavigationProp } from "@react-navigation/bottom-tabs";
import LinearGradient from "react-native-linear-gradient";
import Color from "color";

import { RootStackParamList } from "../Main";
import { useStoreActions, useStoreState } from "../state/store";
import TransactionCard from "../components/TransactionCard";
import Container from "../components/Container";
import { timeout, toast } from "../utils/index";
import { formatBitcoin, convertBitcoinToFiat } from "../utils/bitcoin-units";
import FooterNav from "../components/FooterNav";
import { Chain } from "../utils/build";
import * as nativeBaseTheme from "../../native-base-theme/variables/commonColor";
import Spinner from "../components/Spinner";
import QrCode from "../components/QrCode";
import Send from "./Send";

const AnimatedIcon = Animated.createAnimatedComponent(Icon);

const theme = nativeBaseTheme.default;
const blixtTheme = nativeBaseTheme.blixtTheme;

const HEADER_MIN_HEIGHT = (StatusBar.currentHeight ?? 0) + 53;
const HEADER_MAX_HEIGHT = 195;
const NUM_TRANSACTIONS_PER_LOAD = 25;
const LOAD_BOTTOM_PADDING = 475;

export interface IOverviewProps {
  navigation: BottomTabNavigationProp<RootStackParamList, "Overview">;
}
function Overview({ navigation }: IOverviewProps) {
  const rpcReady = useStoreState((store) => store.lightning.rpcReady);
  const balance = useStoreState((store) => store.channel.balance);
  const pendingOpenBalance = useStoreState((store) => store.channel.pendingOpenBalance);
  const bitcoinUnit = useStoreState((store) => store.settings.bitcoinUnit);
  const transactions = useStoreState((store) => store.transaction.transactions);
  const nodeInfo = useStoreState((store) => store.lightning.nodeInfo);
  const fiatUnit = useStoreState((store) => store.settings.fiatUnit);
  const currentRate = useStoreState((store) => store.fiat.currentRate);
  const preferFiat = useStoreState((store) => store.settings.preferFiat);
  const changePreferFiat  = useStoreActions((store) => store.settings.changePreferFiat);
  const experimentWeblnEnabled = useStoreState((store) => store.settings.experimentWeblnEnabled);
  const hideExpiredInvoices = useStoreState((store) => store.settings.hideExpiredInvoices);

  const bitcoinAddress = useStoreState((store) => store.onChain.address);
  const onboardingState  = useStoreState((store) => store.onboardingState);

  const scrollYAnimatedValue = useRef(new Animated.Value(0)).current;
  const [refreshing, setRefreshing] = useState(false);

  const [contentExpand, setContentExpand] = useState<number>(1);
  const [expanding, setExpanding] = useState<boolean>(false);

  const getBalance = useStoreActions((store) => store.channel.getBalance);
  const getFiatRate = useStoreActions((store) => store.fiat.getRate);
  const checkOpenTransactions = useStoreActions((store) => store.transaction.checkOpenTransactions);
  const getInfo = useStoreActions((store) => store.lightning.getInfo);

  const headerHeight = scrollYAnimatedValue.interpolate({
    inputRange: [0, (HEADER_MAX_HEIGHT - HEADER_MIN_HEIGHT)],
    outputRange: [HEADER_MAX_HEIGHT, HEADER_MIN_HEIGHT],
    extrapolate: "clamp",
  });

  const headerFiatOpacity = scrollYAnimatedValue.interpolate({
    inputRange: [0, (HEADER_MAX_HEIGHT - HEADER_MIN_HEIGHT)],
    outputRange: [1, 0],
    extrapolate: "clamp",
    easing: Easing.bezier(0.16, 0.9, 0.3, 1),
  });

  const headerBtcFontSize = scrollYAnimatedValue.interpolate({
    inputRange: [0, (HEADER_MAX_HEIGHT - HEADER_MIN_HEIGHT)],
    outputRange: [bitcoinUnit === "satoshi" ? 34 : 37, 27],
    extrapolate: "clamp",
  });

  const iconOpacity = scrollYAnimatedValue.interpolate({
    inputRange: [0, (HEADER_MAX_HEIGHT - HEADER_MIN_HEIGHT)],
    outputRange: [1, 0],
    extrapolate: "clamp",
    easing: Easing.bezier(0.16, 0.8, 0.3, 1),
  });

  const refreshControl = (
    <RefreshControl
      title="Refreshing"
      progressViewOffset={183}
      refreshing={refreshing}
      colors={[blixtTheme.light]}
      progressBackgroundColor={blixtTheme.gray}
      onRefresh={async () => {
        if (!rpcReady) {
          return;
        }
        setRefreshing(true);
        await Promise.all([
          getBalance(),
          getFiatRate(),
          checkOpenTransactions(),
          getInfo(),
          timeout(1000),
        ]);
        setRefreshing(false);
      }}
    />
  );

  const transactionListOnScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    Animated.event(
      [{ nativeEvent: { contentOffset: { y: scrollYAnimatedValue }}}],
      { useNativeDriver: false },
    )(event);

    const { layoutMeasurement, contentOffset, contentSize } = event.nativeEvent;
    const paddingToBottom = LOAD_BOTTOM_PADDING;
    if (!expanding && (layoutMeasurement.height + contentOffset.y >= contentSize.height - paddingToBottom)) {
      if ((contentExpand * NUM_TRANSACTIONS_PER_LOAD) < transactions.length) {
        setExpanding(true);
        setTimeout(() => setExpanding(false), 1000);
        setContentExpand(contentExpand + 1);
      }
    }
  };

  const txs = useMemo(() => {
    if (transactions.length > 0) {
      return transactions
        .filter((transaction) => hideExpiredInvoices ? !(transaction.status === "EXPIRED" || transaction.status === "CANCELED") : true)
        .map((transaction, key) => {
          if (key > contentExpand * NUM_TRANSACTIONS_PER_LOAD) {
            return null;
          }
          return (<TransactionCard key={transaction.rHash} transaction={transaction} unit={bitcoinUnit} onPress={(rHash) => navigation.navigate("TransactionDetails", { rHash })} />);
      });
    }
    return (<Text style={{ textAlign: "center", margin: 16 }}>No transactions yet</Text>);
  }, [transactions, contentExpand, bitcoinUnit, hideExpiredInvoices]);

  const onPressBalanceHeader = async () => {
    await changePreferFiat(!preferFiat);
  }

  const onPressSyncIcon = () => {
    navigation.navigate("SyncInfo");
  };

  const bitcoinBalance = formatBitcoin(balance, bitcoinUnit, false);
  const fiatBalance = convertBitcoinToFiat(balance, currentRate, fiatUnit);

  return (
    <Container>
      <StatusBar
        barStyle="light-content"
        hidden={false}
        backgroundColor="transparent"
        animated={false}
        translucent={true}
      />
      <View style={style.overview}>
        <ScrollView
          contentContainerStyle={style.transactionList}
          scrollEventThrottle={16}
          refreshControl={refreshControl}
          onScroll={transactionListOnScroll}
          testID="TX_LIST"
        >
          {onboardingState === "SEND_ONCHAIN" &&
            <SendOnChain bitcoinAddress={bitcoinAddress} />
          }
          {onboardingState === "DO_BACKUP" &&
            <DoBackup />
          }
          {txs}
        </ScrollView>
        <Animated.View style={{ ...style.animatedTop, height: headerHeight }} pointerEvents="box-none">
          <LinearGradient style={style.top} colors={Chain === "mainnet" ? [blixtTheme.secondary, blixtTheme.primary] : [blixtTheme.lightGray, Color(blixtTheme.lightGray).darken(0.30).hex()]} pointerEvents="box-none">
            <View style={StyleSheet.absoluteFill}>
              <AnimatedIcon
                style={[style.onchainIcon, { opacity: iconOpacity }]} type="FontAwesome" name="btc" onPress={() => navigation.navigate("OnChain")}
              />
              <AnimatedIcon
                style={[style.channelsIcon, { opacity: iconOpacity }]} type="Entypo" name="thunder-cloud" onPress={() => navigation.navigate("LightningInfo")}
              />
              <AnimatedIcon
                style={[style.settingsIcon, {}]} type="AntDesign" name="setting" onPress={() => navigation.navigate("Settings")}
              />
              <AnimatedIcon
                style={[style.helpIcon, { opacity: iconOpacity }]} type="MaterialIcons" name="live-help" onPress={() => navigation.navigate("Help")}
              />
              {(!nodeInfo || !nodeInfo.syncedToChain) &&
                <Animated.View style={[style.lightningSyncIcon, { opacity: iconOpacity}]}>
                  <Spinner onPress={onPressSyncIcon} />
                </Animated.View>
              }
              {Chain === "mainnet" && nodeInfo && nodeInfo.syncedToChain && experimentWeblnEnabled &&
                <AnimatedIcon
                  style={[style.weblnBrowswerIcon, { opacity: iconOpacity }]} type="MaterialCommunityIcons" name="cart-outline" onPress={() => navigation.navigate("WebLNBrowser")}
                />
              }
            </View>

            {/* Big header */}
            <Animated.Text testID="BIG_BALANCE_HEADER" onPress={onPressBalanceHeader} style={{...headerInfo.btc, fontSize: headerBtcFontSize }}>
              {!preferFiat && bitcoinBalance}
              {preferFiat && fiatBalance}
            </Animated.Text>

            {/* Small header */}
            {pendingOpenBalance.equals(0) &&
              <Animated.Text style={{opacity: headerFiatOpacity, ...headerInfo.fiat}}>
                {!preferFiat && fiatBalance}
                {preferFiat && bitcoinBalance}
              </Animated.Text>
            }
            {/* Pending open balance */}
            {pendingOpenBalance.greaterThan(0) &&
              <Animated.Text style={{opacity: headerFiatOpacity, ...headerInfo.pending}}>
                {!preferFiat && <>({formatBitcoin(pendingOpenBalance, bitcoinUnit)} pending)</>}
                {preferFiat && <>({convertBitcoinToFiat(pendingOpenBalance, currentRate, fiatUnit)} pending)</>}
              </Animated.Text>
            }
          </LinearGradient>
        </Animated.View>
      </View>
    </Container>
  );
};


interface ISendOnChain {
  bitcoinAddress?: string;
}
const SendOnChain = ({ bitcoinAddress }: ISendOnChain) => {
  const onQrPress = () => {
    Clipboard.setString(bitcoinAddress!);
    toast("Bitcoin address copied to clipboard");
  };

  return (
    <Card>
      <CardItem>
        <View style={{ flex: 1, flexDirection: "row", justifyContent:"space-between" }}>
          <View style={{ width: "53%", justifyContent:"center", paddingRight: 4 }}>
            <Text style={{ fontSize: 15 }}>
              Welcome to Blixt!{"\n\n"}
              To get started, send on-chain funds to the bitcoin address to the right
            </Text>
          </View>
          <View>
            {bitcoinAddress
              ? <QrCode onPress={onQrPress} data={bitcoinAddress?.toUpperCase() ?? " "} size={135} border={10} />
              : <View style={{ width: 135 + 10 + 9, height: 135 + 10 + 8, justifyContent: "center" }}>
                  <NativeBaseSpinner color={blixtTheme.light} />
                </View>
            }
          </View>
        </View>
      </CardItem>
    </Card>
  );
};

const DoBackup = () => {
  const navigation = useNavigation();
  const changeOnboardingState = useStoreActions((store) => store.changeOnboardingState);

  const onPressDismiss = async () => {
    await changeOnboardingState("DONE");
  };

  const onPressBackupWallet = () => {
    navigation.navigate("Welcome", { screen: "Seed"})
  };

  return (
    <Card>
      <CardItem>
        <View style={{ flex: 1 }}>
          <View>
            <Text>Thank you for using Blixt Wallet!{"\n\n"}We recommend making a backup of the wallet so that you can restore your funds in case of a phone loss.</Text>
          </View>
          <View style={{ flexDirection: "row-reverse" }}>
            <Button small style={{marginLeft: 7 }} onPress={onPressBackupWallet}>
              <Text style={{ fontSize: 11 }}>Backup wallet</Text>
            </Button>
            <Button small onPress={onPressDismiss}>
              <Text style={{ fontSize: 11 }}>Dismiss</Text>
            </Button>
          </View>
        </View>
      </CardItem>
    </Card>
  );
}

const iconTopPadding = StatusBar.currentHeight ?? 0;

const style = StyleSheet.create({
  overview: {
    flex: 1,
    backgroundColor: blixtTheme.dark,
  },
  animatedTop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    justifyContent: "center",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: theme.blixtFooterBorderColor,
  },
  top: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    height: "100%",
  },
  onchainIcon: {
    position: "absolute",
    padding: 4,
    paddingRight: 8,
    top: 12 + iconTopPadding,
    left: 8,
    fontSize: 25,
    color: blixtTheme.light,
  },
  channelsIcon: {
    position: "absolute",
    padding: 4,
    paddingRight: 8,
    top: 12 + iconTopPadding,
    left: 8 + 24 + 8 + 1,
    fontSize: 28,
    color: blixtTheme.light,
  },
  settingsIcon: {
    position: "absolute",
    padding: 4,
    top: 12 + iconTopPadding,
    right: 8,
    fontSize: 27,
    color: blixtTheme.light,
  },
  helpIcon: {
    position: "absolute",
    padding: 4,
    top: 13 + iconTopPadding,
    right: 8 + 24 + 8 + 8,
    fontSize: 25,
    color: blixtTheme.light,
  },
  lightningSyncIcon: {
    position: "absolute",
    padding: 4,
    top: 12 + iconTopPadding,
    right: 8 + 24 + 8 + 24 + 8 + 14,
    fontSize: 24,
    color: blixtTheme.light,
  },
  weblnBrowswerIcon: {
    position: "absolute",
    padding: 4,
    top: 13 + iconTopPadding,
    right: 8 + 24 + 8 + 24 + 8 + 14,
    fontSize: 24,
    color: blixtTheme.light,
  },
  transactionList: {
    paddingTop: HEADER_MAX_HEIGHT + 10,
    paddingLeft: 7,
    paddingRight: 7,
    paddingBottom: 12,
  },
});

const headerInfo = StyleSheet.create({
  btc: {
    color: blixtTheme.light,
    marginTop: 14 + iconTopPadding + 16,
    //paddingTop: iconTopPadding + 16,
    marginBottom: 2,
    fontFamily: theme.fontFamily,
  },
  fiat: {
    color: blixtTheme.light,
    fontSize: 18,
    fontFamily: theme.fontFamily,
  },
  pending: {
    color: "#d6dbdb",
    fontSize: 18,
    fontFamily: theme.fontFamily,
  }
});

const OverviewTabs = createBottomTabNavigator();
export function OverviewTabsComponent() {
  return (
    <OverviewTabs.Navigator tabBar={() => <FooterNav />}>
      <OverviewTabs.Screen name="Overview" component={Overview} />
    </OverviewTabs.Navigator>
  );
};

const TopTabs = createMaterialTopTabNavigator();
export default function TopTabsComponent() {
  return (
    <TopTabs.Navigator
      springVelocityScale={1.4}
      lazy={true}
      sceneContainerStyle={{
        backgroundColor:"transparent"
      }}
      tabBarOptions={{
        style: {
          height: 0
        },
      }}
    >
      <TopTabs.Screen name="OverviewX" component={OverviewTabsComponent}  />
      <TopTabs.Screen name="SendX" component={Send} initialParams={{ viaSwipe: true }}  />
    </TopTabs.Navigator>
  );
}
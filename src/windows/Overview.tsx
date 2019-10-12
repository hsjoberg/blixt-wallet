import React, { useState, useRef, useMemo } from "react";
import { Alert, Animated, StyleSheet, View, ScrollView, StatusBar, Easing, RefreshControl, NativeSyntheticEvent, NativeScrollEvent } from "react-native";
import { Icon, Text } from "native-base";
import LinearGradient from "react-native-linear-gradient";
import { NavigationScreenProp } from "react-navigation";

import { useStoreActions, useStoreState } from "../state/store";
import TransactionCard from "../components/TransactionCard";
import Container from "../components/Container";
import { timeout } from "../utils/index";
import { formatBitcoin, convertBitcoinToFiat } from "../utils/bitcoin-units";

const nativeBaseTheme = require("../../native-base-theme/variables/commonColor");
const theme = nativeBaseTheme.default;
const blixtTheme = nativeBaseTheme.blixtTheme;

const HEADER_MIN_HEIGHT = (StatusBar.currentHeight || 0) + 53;
const HEADER_MAX_HEIGHT = 195;
const NUM_TRANSACTIONS_PER_LOAD = 25;
const LOAD_BOTTOM_PADDING = 475;

export interface IOverviewProps {
  navigation: NavigationScreenProp<{}>;
}
export default ({ navigation }: IOverviewProps)  => {
  const balance = useStoreState((store) => store.channel.balance);
  const pendingOpenBalance = useStoreState((store) => store.channel.pendingOpenBalance);
  const bitcoinUnit = useStoreState((store) => store.settings.bitcoinUnit);
  const transactions = useStoreState((store) => store.transaction.transactions);
  const nodeInfo = useStoreState((store) => store.lightning.nodeInfo);
  const fiatUnit = useStoreState((store) => store.settings.fiatUnit);
  const currentRate = useStoreState((store) => store.fiat.currentRate);

  const scrollYAnimatedValue = useRef(new Animated.Value(0));
  const [refreshing, setRefreshing] = useState(false);

  const [contentExpand, setContentExpand] = useState<number>(1);
  const [expanding, setExpanding] = useState<boolean>(false);

  const getBalance = useStoreActions((store) => store.channel.getBalance);
  const getFiatRate = useStoreActions((store) => store.fiat.getRate);
  const checkOpenTransactions = useStoreActions((store) => store.transaction.checkOpenTransactions);

  const headerHeight = scrollYAnimatedValue.current.interpolate({
    inputRange: [0, (HEADER_MAX_HEIGHT - HEADER_MIN_HEIGHT)],
    outputRange: [HEADER_MAX_HEIGHT, HEADER_MIN_HEIGHT],
    extrapolate: "clamp",
  });

  const headerFiatOpacity = scrollYAnimatedValue.current.interpolate({
    inputRange: [0, (HEADER_MAX_HEIGHT - HEADER_MIN_HEIGHT)],
    outputRange: [1, 0],
    extrapolate: "clamp",
    easing: Easing.bezier(0.16, 0.9, 0.3, 1),
  });

  const headerBtcFontSize = scrollYAnimatedValue.current.interpolate({
    inputRange: [0, (HEADER_MAX_HEIGHT - HEADER_MIN_HEIGHT)],
    outputRange: [bitcoinUnit === "satoshi" ? 34 : 37, 27],
    extrapolate: "clamp",
  });

  const refreshControl = (
    <RefreshControl title="Refreshing" progressViewOffset={183} refreshing={refreshing} colors={[blixtTheme.light]} progressBackgroundColor={blixtTheme.gray}
      onRefresh={async () => {
        setRefreshing(true);
        await Promise.all([
          getBalance(),
          getFiatRate(),
          checkOpenTransactions(),
          timeout(1000),
        ]);
        setRefreshing(false);
      }}
    />
  );

  const transactionListOnScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    Animated.event(
      [{ nativeEvent: { contentOffset: { y: scrollYAnimatedValue.current }}}],
      { useNativeDriver: false },
    )(event);

    const { layoutMeasurement, contentOffset, contentSize } = event.nativeEvent;
    const paddingToBottom = LOAD_BOTTOM_PADDING;
    if (!expanding && (layoutMeasurement.height + contentOffset.y >= contentSize.height - paddingToBottom)) {
      if ((contentExpand * NUM_TRANSACTIONS_PER_LOAD) < transactions.length) {
        console.log("expanding");
        setExpanding(true);
        setTimeout(() => setExpanding(false), 1000);
        setContentExpand(contentExpand + 1);
      }
    }
  };

  const txs = useMemo(() => {
    if (transactions.length > 0) {
      return transactions.map((transaction, key) => {
        if (key > contentExpand * NUM_TRANSACTIONS_PER_LOAD) {
          return null;
        }
        return (<TransactionCard key={key} transaction={transaction} unit={bitcoinUnit} onPress={(rHash) => navigation.navigate("TransactionDetails", { rHash })} />);
      });
    }
    return (<Text style={{ textAlign: "center", margin: 16 }}>No transactions yet</Text>);
  }, [transactions, contentExpand, bitcoinUnit]);

  return (
    <Container>
      <StatusBar
        barStyle="light-content"
        hidden={false}
        backgroundColor="transparent"
        animated={true}
        translucent={true}
      />
      <View style={style.overview}>
        <ScrollView
          contentContainerStyle={style.transactionList}
          scrollEventThrottle={16}
          refreshControl={refreshControl}
          onScroll={transactionListOnScroll}
        >
          {txs}
        </ScrollView>
        <Animated.View style={{ ...style.animatedTop, height: headerHeight }} pointerEvents="box-none">
          <LinearGradient style={style.top} colors={[blixtTheme.secondary, blixtTheme.primary]} pointerEvents="box-none">
            <View style={StyleSheet.absoluteFill}>
              <Icon
                style={style.onchainIcon} type="FontAwesome" name="btc" onPress={() => navigation.navigate("OnChain")}
              />
              <Icon
                style={style.channelsIcon} type="Entypo" name="thunder-cloud" onPress={() => navigation.navigate("LightningInfo")}
              />
              <Icon
                style={style.settingsIcon} type="AntDesign" name="setting" onPress={() => navigation.navigate("Settings")}
              />
              {(!nodeInfo || !nodeInfo.syncedToChain) &&
                <Icon
                  style={style.lightningSyncIcon} name="sync" onPress={() => Alert.alert("Blixt Wallet is currently syncing the Bitcoin Blockchain.")}
                />
              }
            </View>
            {<Animated.Text style={{...headerInfo.btc, fontSize: headerBtcFontSize}}>
              {formatBitcoin(balance, bitcoinUnit, false)}
            </Animated.Text>}
            {pendingOpenBalance.greaterThan(0)
              ? (<Animated.Text style={{opacity: headerFiatOpacity, ...headerInfo.pending}}>
                  ({formatBitcoin(pendingOpenBalance, bitcoinUnit)} pending)
                </Animated.Text>)
              : (<Animated.Text style={{opacity: headerFiatOpacity, ...headerInfo.fiat}}>
                  {convertBitcoinToFiat(balance, currentRate, fiatUnit)}
                </Animated.Text>)
            }
          </LinearGradient>
        </Animated.View>
      </View>
    </Container>
  );
};

const iconTopPadding = StatusBar.currentHeight || 0; // 31;

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
    fontSize: 24,
    color: blixtTheme.light,
  },
  channelsIcon: {
    position: "absolute",
    padding: 4,
    paddingRight: 8,
    top: 13 + iconTopPadding,
    left: 8 + 24 + 8,
    fontSize: 24,
    color: blixtTheme.light,
  },
  settingsIcon: {
    position: "absolute",
    padding: 4,
    top: 13 + iconTopPadding,
    right: 8,
    fontSize: 24,
    color: blixtTheme.light,
  },
  lightningSyncIcon: {
    position: "absolute",
    padding: 4,
    top: 13 + iconTopPadding,
    right: 8 + 24 + 8 + 4,
    fontSize: 24,
    color: blixtTheme.light,
  },
  transactionList: {
    paddingTop: HEADER_MAX_HEIGHT + 12,
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

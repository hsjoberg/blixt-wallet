import React, { useState, useRef, useEffect, useLayoutEffect } from "react";
import { Alert, Animated, StyleSheet, View, ScrollView, StatusBar, Easing, RefreshControl, FlatList, SectionList, NativeSyntheticEvent, NativeScrollEvent } from "react-native";
import { Container, Icon, Text } from "native-base";
import LinearGradient from "react-native-linear-gradient";
import { useStoreActions, useStoreState } from "../state/store";

import TransactionCard from "../components/TransactionCard";
import { NavigationScreenProp, createStackNavigator } from "react-navigation";

import theme, { blixtTheme } from "../../native-base-theme/variables/commonColor";

const HEADER_MIN_HEIGHT = (StatusBar.currentHeight || 0) + 53;
const HEADER_MAX_HEIGHT = 195;
const NUM_TRANSACTIONS_PER_LOAD = 25;
const LOAD_BOTTOM_PADDING = 475;


export interface IOverviewProps {
  navigation: NavigationScreenProp<{}>;
}
export default ({ navigation }: IOverviewProps)  => {
  const balance = useStoreState((store) => store.channel.balance);
  const transactions = useStoreState((store) => store.transaction.transactions);
  const nodeInfo = useStoreState((store) => store.lightning.nodeInfo);

  const scrollYAnimatedValue = useRef(new Animated.Value(0));
  const [refreshing, setRefreshing] = useState(false);

  const [contentExpand, setContentExpand] = useState<number>(1);
  const [expanding, setExpanding] = useState<boolean>(false);

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
    outputRange: [39, 27],
    extrapolate: "clamp",
  });

  const refreshControl = (
    <RefreshControl title="Refreshing" progressViewOffset={183} refreshing={refreshing} colors={[blixtTheme.light]} progressBackgroundColor={blixtTheme.gray}
      onRefresh={() => {
        setRefreshing(true);
        setTimeout(() => {
          setRefreshing(false);
        }, 1500);
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
      console.log("expanding");
      setExpanding(true);
      setTimeout(() => setExpanding(false), 1000);
      setContentExpand(contentExpand + 1);
    }
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
      <View style={style.overview}>
        <ScrollView
          contentContainerStyle={style.transactionList}
          scrollEventThrottle={16}
          refreshControl={refreshControl}
          onScroll={transactionListOnScroll}
        >
          {transactions.map((transaction, key) => {
            if (key > contentExpand * NUM_TRANSACTIONS_PER_LOAD) {
              return null;
            }
            return (<TransactionCard key={key} transaction={transaction} onPress={(rHash) => navigation.navigate("TransactionDetails", { rHash })} />);
          })}
          {transactions.length === 0 && <Text style={{ textAlign: "center", margin: 16 }}>No transactions yet</Text>}
        </ScrollView>
        <Animated.View style={{ ...style.animatedTop, height: headerHeight }} pointerEvents="box-none">
          <LinearGradient style={style.top} colors={[blixtTheme.secondary, blixtTheme.primary]} pointerEvents="box-none">
            <View style={StyleSheet.absoluteFill}>
              <Icon
                style={style.onchainIcon} type="FontAwesome" name="btc"
                onPress={() => navigation.navigate("OnChain")}
              />
              <Icon
                style={style.channelsIcon} type="Entypo" name="thunder-cloud"
                onPress={() => navigation.navigate("LightningInfo")}
              />
              <Icon
                style={style.settingsIcon} type="AntDesign" name="setting"
                onPress={() => navigation.navigate("Settings")}
              />
              {(!nodeInfo || !nodeInfo.syncedToChain) &&
                <Icon
                  style={style.lightningSyncIcon} name="sync"
                  onPress={() => Alert.alert("Blixt Wallet is currently syncing the Bitcoin Blockchain.")}
                />
              }
            </View>
            {<Animated.Text style={{...headerInfo.btc, fontSize: headerBtcFontSize}}>
                {formatSatToBtc(balance)} ₿
            </Animated.Text>}
            <Animated.Text style={{opacity: headerFiatOpacity, ...headerInfo.fiat}}>
                {convertSatToFiat(balance)} SEK
            </Animated.Text>
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
    paddingLeft: 8,
    paddingRight: 8,
    paddingBottom: 12,
  },
});

const headerInfo = StyleSheet.create({
  btc: {
    color: blixtTheme.light,
    marginTop: 14,
    paddingTop: iconTopPadding + 16,
    marginBottom: 3,
    fontFamily: theme.fontFamily,
  },
  fiat: {
    color: blixtTheme.light,
    fontSize: 18,
    fontFamily: theme.fontFamily,
  },
});

function formatSatToBtc(sat: number) {
  return sat / 100000000;
}

function convertSatToFiat(sat: number) {
  return Number.parseFloat(((sat / 100000000) * 76270).toFixed(2));
}

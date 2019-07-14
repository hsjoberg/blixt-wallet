import React, { useState, useRef, useEffect } from "react";
import { Alert, Animated, StyleSheet, View, ScrollView, StatusBar, Easing, RefreshControl } from "react-native";
import { Container, Icon, Text } from "native-base";
import LinearGradient from "react-native-linear-gradient";
import { useStoreActions, useStoreState } from "../state/store";

import TransactionCard from "../components/TransactionCard";
import { NavigationScreenProp, createStackNavigator } from "react-navigation";

import theme, { blixtTheme } from "../../native-base-theme/variables/commonColor";

const HEADER_MIN_HEIGHT = (StatusBar.currentHeight || 0) + 53;
const HEADER_MAX_HEIGHT = 195;


export interface IOverviewProps {
  navigation: NavigationScreenProp<{}>;
}
export default ({ navigation }: IOverviewProps)  => {
  const balance = useStoreState((store) => store.lightning.balance);
  const transactions = useStoreState((store) => store.transaction.transactions);
  const getTransactions = useStoreActions((store) => store.transaction.getTransactions);
  const checkOpenTransactions = useStoreActions((store) => store.transaction.checkOpenTransactions);

  const [scrollYAnimatedValue] = useState(new Animated.Value(0)); // TODO fix this...
  const [refreshing, setRefreshing] = useState(false);
  const transactionListScroll = useRef<ScrollView>();

  const headerHeight = scrollYAnimatedValue.interpolate({
    inputRange: [0, (HEADER_MAX_HEIGHT - HEADER_MIN_HEIGHT)],
    outputRange: [HEADER_MAX_HEIGHT, HEADER_MIN_HEIGHT],
    extrapolate: "clamp",
  });

  const headerFiatOpacity = scrollYAnimatedValue.interpolate({
    inputRange: [0, (HEADER_MAX_HEIGHT - HEADER_MIN_HEIGHT)],
    outputRange: [1, 0], extrapolate: "clamp", easing: Easing.bezier(0.16, 0.9, 0.3, 1),
  });

  const headerBtcFontSize = scrollYAnimatedValue.interpolate({
    inputRange: [0, (HEADER_MAX_HEIGHT - HEADER_MIN_HEIGHT)],
    outputRange: [39, 27], extrapolate: "clamp",
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

  useEffect(() => {
    (async () => {
      // This is done in InitLightning right now
      // To prevent unwanted flash of "No transactions yet"
      // await getTransactions();
      await checkOpenTransactions();
    })();
  }, []);

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
          ref={transactionListScroll} contentContainerStyle={style.transactionList}
          scrollEventThrottle={60}
          refreshControl={refreshControl}
          onScroll={
            Animated.event(
              [{ nativeEvent: { contentOffset: { y: scrollYAnimatedValue }}}],
              { useNativeDriver: false },
            )
          }
          onMomentumScrollEnd={(event: any) => {
            const y = event.nativeEvent.contentOffset.y;
            if (0 < y && y < HEADER_MAX_HEIGHT / 3.2) {
              if (transactionListScroll.current) {
                // transactionListScroll.current.scrollTo({y: 0});
              }
            }
            else if (HEADER_MAX_HEIGHT / 3.2 <= y && y < HEADER_MAX_HEIGHT) {
              if (transactionListScroll.current) {
                // transactionListScroll.current.scrollTo({y: HEADER_MAX_HEIGHT});
              }
            }
          }}
        >
          {transactions.map((transaction, key) => (
            <TransactionCard key={key} transaction={transaction} onPress={(rHash) => navigation.navigate("TransactionDetails", { rHash })} />
          ))}
          {transactions.length === 0 && <Text style={{ textAlign: "center", margin: 16 }}>No transactions yet</Text>}
        </ScrollView>
        <Animated.View
           style={{ ...style.animatedTop, height: headerHeight }}
           pointerEvents="box-none">
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
console.log("currentHeight", StatusBar.currentHeight);

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
    color: blixtTheme.light, // "#d3a100",
  },
  channelsIcon: {
    position: "absolute",
    padding: 4,
    paddingRight: 8,
    top: 13 + iconTopPadding,
    left: 8 + 24 + 8,
    fontSize: 24,
    color: blixtTheme.light, // "#007FFF",
  },
  settingsIcon: {
    position: "absolute",
    padding: 4,
    top: 13 + iconTopPadding,
    right: 8,
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
    color: blixtTheme.light, // "#222",
    marginTop: 14,
    paddingTop: iconTopPadding + 16,
    marginBottom: 3,
    fontFamily: theme.fontFamily,
  },
  fiat: {
    color: blixtTheme.light, // "#666",
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

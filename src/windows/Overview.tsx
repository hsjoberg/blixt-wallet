import React, { useState, useRef, useEffect } from "react";
import { Alert, Animated, StyleSheet, View, ScrollView, StatusBar, Easing, RefreshControl } from "react-native";
import { Container, Icon, Text } from "native-base";
import LinearGradient from "react-native-linear-gradient";
import { useActions, useStore } from "../state/store";

import TransactionCard from "../components/TransactionCard";
import { NavigationScreenProp } from "react-navigation";

const HEADER_MIN_HEIGHT = 56;
const HEADER_MAX_HEIGHT = 220;


export interface IOverviewProps {
  navigation: NavigationScreenProp<{}>;
}
export default ({ navigation }: IOverviewProps)  => {
  const balance = useStore((store) => store.lightning.balance);
  const transactions = useStore((store) => store.transaction.transactions);
  const getTransactions = useActions((store) => store.transaction.getTransactions);

  const [scrollYAnimatedValue] = useState(new Animated.Value(0)); // TODO fix this...
  const [refreshing, setRefreshing] = useState(false);
  const transactionListScroll = useRef<ScrollView>();

  const headerHeight = scrollYAnimatedValue.interpolate({
    inputRange: [0, ( HEADER_MAX_HEIGHT - HEADER_MIN_HEIGHT )],
    outputRange: [ HEADER_MAX_HEIGHT, HEADER_MIN_HEIGHT ], extrapolate: "clamp",
  });

  const headerFiatOpacity = scrollYAnimatedValue.interpolate({
    inputRange: [0, (HEADER_MAX_HEIGHT - HEADER_MIN_HEIGHT)],
    outputRange: [1, 0], extrapolate: "clamp", easing: Easing.bezier(0.16, 0.9, 0.3, 1),
  });

  const headerBtcFontSize = scrollYAnimatedValue.interpolate({
    inputRange: [0, (HEADER_MAX_HEIGHT - HEADER_MIN_HEIGHT)],
    outputRange: [40, 28], extrapolate: "clamp",
  });

  const refreshControl = (
    <RefreshControl title="Refreshing" progressViewOffset={200} refreshing={refreshing} colors={["orange"]}
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
      await getTransactions();
    })();
  }, []);

  return (
    <Container>
      <StatusBar
        barStyle="dark-content"
        hidden={false}
        backgroundColor="#FFF"
        animated={true}
        translucent={false}
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
                transactionListScroll.current.scrollTo({y: 0});
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
            <TransactionCard key={key} transaction={transaction} onPress={(id) => Alert.alert("Transaction")} />
          ))}
          {transactions.length === 0 && <Text style={{ textAlign: "center", margin: 16, color: "#888" }}>No transactions yet</Text>}
        </ScrollView>
        <Animated.View
           style={{ ...style.animatedTop, height: headerHeight }}
           pointerEvents="box-none">
          <LinearGradient style={style.top} colors={["#FFF", "#FFF"]} pointerEvents="box-none">
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

const style = StyleSheet.create({
  animatedTop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    justifyContent: "center",
    alignItems: "center",
  },
  top: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    height: "100%",
    borderBottomColor: "#CCC",
    borderBottomWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 6,
  },
  onchainIcon: {
    position: "absolute",
    padding: 4,
    paddingRight: 8,
    top: 10,
    left: 8,
    fontSize: 24,
    color: "#d3a100",
  },
  channelsIcon: {
    position: "absolute",
    padding: 4,
    paddingRight: 8,
    top: 11,
    left: 8 + 24 + 8,
    fontSize: 24,
    color: "#007FFF",
  },
  settingsIcon: {
    position: "absolute",
    padding: 4,
    top: 10,
    right: 8,
    fontSize: 24,
    color: "#2b3751",
  },
  overview: {
    flex: 1,
     backgroundColor: "#EFEFEF",
  },
  transactionList: {
    paddingTop: HEADER_MAX_HEIGHT + 12,
    paddingLeft: 8,
    paddingRight: 8,
    paddingBottom: 12,
    backgroundColor: "#EFEFEF",
  },
});

const headerInfo = StyleSheet.create({
  btc: {
    color: "#222",
    marginTop: 14,
    paddingTop: 20,
    marginBottom: 5,
  },
  fiat: {
    color: "#666",
    fontSize: 22,
  },
});

function formatSatToBtc(sat: number) {
  return sat / 100000000;
}

function convertSatToFiat(sat: number) {
  return Number.parseFloat(((sat / 100000000) * 76270).toFixed(2));
}

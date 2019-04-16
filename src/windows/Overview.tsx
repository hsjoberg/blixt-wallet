import React, { Component, useState, useRef } from "react";
import { Alert, Animated, StyleSheet, View, ScrollView, StatusBar, Easing, RefreshControl } from "react-native";
import { Icon, H3, Root } from "native-base";
import { Col, Row, Grid } from "react-native-easy-grid";
import LinearGradient from "react-native-linear-gradient";

import TransactionCard from "../components/TransactionCard";

const HEADER_MIN_HEIGHT = 56;
const HEADER_MAX_HEIGHT = 220;

interface IProps {
  onSettingsClick: () => void;
}

export default ({ onSettingsClick }: IProps) => {
  const [scrollYAnimatedValue, setScrollYAnimatedValue] = useState(new Animated.Value(0)); // TODO fix this...
  const [refreshing, setRefreshing] = useState(false);
  const transactionListScroll = useRef<ScrollView>();

  const headerHeight = scrollYAnimatedValue.interpolate({
    inputRange: [0, ( HEADER_MAX_HEIGHT - HEADER_MIN_HEIGHT )],
    outputRange: [ HEADER_MAX_HEIGHT, HEADER_MIN_HEIGHT ],
    extrapolate: "clamp",
  });

  const headerBackgroundColor = scrollYAnimatedValue.interpolate({
    inputRange: [0, (HEADER_MAX_HEIGHT - HEADER_MIN_HEIGHT)],
    outputRange: ["#212121", "#01579B"],
    extrapolate: "clamp",
  });

  const headerFiatOpacity = scrollYAnimatedValue.interpolate({
    inputRange: [0, (HEADER_MAX_HEIGHT - HEADER_MIN_HEIGHT)],
    outputRange: [1, 0],
    extrapolate: "clamp",
    easing: Easing.bezier(0.165, 0.84, 0.44, 1),
  });

  const headerBtcFontSize = scrollYAnimatedValue.interpolate({
    inputRange: [0, (HEADER_MAX_HEIGHT - HEADER_MIN_HEIGHT)],
    outputRange: [40, 28],
    extrapolate: "clamp",
  });

  const refreshControl = (
    <RefreshControl title="Refreshing" progressViewOffset={200} refreshing={refreshing} colors={["orange"]}
      onRefresh={() => {
      setRefreshing(true);
      setTimeout(() => {
        setRefreshing(false);
      }, 1500);
    }}
  />);

  return (
    <>
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
            {(new Array(4).fill(null)).map((_, key) =>
              <TransactionCard key={key} onPress={(id) => Alert.alert("Transaction")} />
            )}
        </ScrollView>
        <Animated.View
           style={{ ...style.animatedTop, height: headerHeight, backgroundColor: headerBackgroundColor}}
           pointerEvents="box-none">
          <LinearGradient style={style.top} colors={["#FFF", "#FFF"]} pointerEvents="box-none">
            <View style={StyleSheet.absoluteFill}>
              <Icon style={style.onchainIcon} type="FontAwesome" name="btc" onPress={() => Alert.alert("Bitcoin")} />
              <Icon style={style.channelsIcon} type="Entypo" name="thunder-cloud" onPress={() => Alert.alert("Lightning")} />
              <Icon style={style.settingsIcon} type="AntDesign" name="setting" onPress={onSettingsClick} />
            </View>
            {<Animated.Text style={{...header.btc, fontSize: headerBtcFontSize}}>0.007 450 32 ₿</Animated.Text>}
            {/*<Animated.Text style={{...header.btc, fontSize: headerBtcFontSize}}>100 000 000 sat</Animated.Text>*/}
            <Animated.View style={{opacity: headerFiatOpacity}}>
              <H3 style={{...header.fiat}}>200 SEK</H3>
            </Animated.View>
          </LinearGradient>
        </Animated.View>
      </View>
    </>
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
    backgroundColor: "#FFF",
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
    backgroundColor: "red",
  },
  transactionList: {

    paddingTop: HEADER_MAX_HEIGHT + 12,
    paddingLeft: 8,
    paddingRight: 8,
    paddingBottom: 12,
    backgroundColor: "#EFEFEF",
  },
});

const header = StyleSheet.create({
  btc: {
    color: "#222",
    marginTop: 5,
    paddingTop: 20,
    marginBottom: 6,
  },
  fiat: {
    color: "#666",
  },
});

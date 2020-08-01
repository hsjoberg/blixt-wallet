import React, { useEffect, useLayoutEffect } from "react";
import { StyleSheet, View, ScrollView } from "react-native";
import { Icon, H1, Fab, Spinner } from "native-base";
import Long from "long";
import { StackNavigationProp } from "@react-navigation/stack";

import { LightningInfoStackParamList } from "./index";
import { useStoreState, useStoreActions } from "../../state/store";
import Container from "../../components/Container";
import ChannelCard from "../../components/ChannelCard";
import PendingChannelCard from "../../components/PendingChannelCard";
import { blixtTheme } from "../../../native-base-theme/variables/commonColor";
import { formatBitcoin, valueFiat } from "../../utils/bitcoin-units";
import { NavigationButton } from "../../components/NavigationButton";

interface ILightningInfoProps {
  navigation: StackNavigationProp<LightningInfoStackParamList, "LightningInfo">;
}
export default function LightningInfo({ navigation }: ILightningInfoProps) {
  const rpcReady = useStoreState((store) => store.lightning.rpcReady);
  const aliases = useStoreState((store) => store.channel.aliases);
  const channels = useStoreState((store) => store.channel.channels);
  const pendingOpenChannels = useStoreState((store) => store.channel.pendingOpenChannels);
  const pendingClosingChannels = useStoreState((store) => store.channel.pendingClosingChannels);
  const pendingForceClosingChannels = useStoreState((store) => store.channel.pendingForceClosingChannels);
  const waitingCloseChannels = useStoreState((store) => store.channel.waitingCloseChannels);
  const getChannels = useStoreActions((store) => store.channel.getChannels);
  const bitcoinUnit = useStoreState((store) => store.settings.bitcoinUnit);
  const fiatUnit = useStoreState((store) => store.settings.fiatUnit);
  const currentRate = useStoreState((store) => store.fiat.currentRate);
  const preferFiat = useStoreState((store) => store.settings.preferFiat);
  const changePreferFiat  = useStoreActions((store) => store.settings.changePreferFiat);

  useEffect(() => {
    if (rpcReady) {
      (async () => {
        await getChannels();
      })();
    }
  }, [getChannels, rpcReady]);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerTitle: "Lightning Network",
      headerShown: true,
      headerRight: () => {
        return (
          <NavigationButton onPress={async () => await getChannels()}>
            <Icon type="MaterialIcons" name="sync" style={{ fontSize: 22 }} />
          </NavigationButton>
        )
      }
    });
  }, [navigation]);

  const balance = channels.reduce((accumulator, channel) => {
    return accumulator.add(channel.localBalance!);
    // if (channel.localBalance!.lessThanOrEqual(channel.localChanReserveSat!)) {
    //   return accumulator;
    // }
    // return accumulator.add(channel.localBalance!.sub(channel.localChanReserveSat!));
  }, Long.fromInt(0));

  const channelCards = [
    ...pendingOpenChannels.map((pendingChannel, i) => (
      <PendingChannelCard
        key={((pendingChannel?.channel?.channelPoint) ?? "") + i}
        alias={aliases[pendingChannel.channel!.remoteNodePub!]}
        type="OPEN"
        channel={pendingChannel}
      />
    )),
    ...pendingClosingChannels.map((pendingChannel, i) => (
      <PendingChannelCard
        key={pendingChannel.closingTxid! + i}
        alias={aliases[pendingChannel.channel!.remoteNodePub!]}
        type="CLOSING"
        channel={pendingChannel}
      />
    )),
    ...pendingForceClosingChannels.map((pendingChannel, i) => (
      <PendingChannelCard
        key={pendingChannel.closingTxid! + i}
        alias={aliases[pendingChannel.channel!.remoteNodePub!]}
        type="FORCE_CLOSING"
        channel={pendingChannel}
      />
    )),
    ...waitingCloseChannels.map((pendingChannel, i) => (
      <PendingChannelCard
        key={((pendingChannel?.channel?.channelPoint) ?? "") + i}
        alias={aliases[pendingChannel.channel?.remoteNodePub ?? ""]}
        type="WAITING_CLOSE"
        channel={pendingChannel}
      />
    )),
    ...channels.map((channel, i) => (
      <ChannelCard key={channel.chanId!.toString()} alias={aliases[channel.remotePubkey ?? ""]} channel={channel} />
    )),
  ];

  const onPressBalance = async () => {
    await changePreferFiat(!preferFiat);
  }

  return (
    <Container>
      {rpcReady &&
        <ScrollView contentContainerStyle={style.container}>
          <View style={style.balanceInfo}>
            <H1 style={[style.spendableAmount]}>
              Balance
            </H1>
            <H1 onPress={onPressBalance}>
              {preferFiat
                ? (valueFiat(balance, currentRate).toFixed(2) + " " + fiatUnit)
                : formatBitcoin(balance, bitcoinUnit)
              }
            </H1>
          </View>
          <View>{channelCards}</View>
        </ScrollView>
      }
      {!rpcReady &&
        <View style={style.loadingContainer}>
          <Spinner color={blixtTheme.light} />
        </View>
      }
      <Fab
        style={style.fab}
        position="bottomRight"
        onPress={() => navigation.navigate("OpenChannel")}>
        <Icon type="Entypo" name="plus" style={style.fabNewChannelIcon} />
      </Fab>
    </Container>
  );
};

const style = StyleSheet.create({
  container: {
    padding: 12,
  },
  loadingContainer: {
    flex: 1,
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  balanceInfo: {
    flex: 1,
    width: "100%",
    justifyContent: "center",
    alignItems: "center",
    paddingTop: 24,
    paddingBottom: 24,
  },
  spendableAmount: {
    textAlign: "center",
  },
  fab: {
    backgroundColor: blixtTheme.primary,
  },
  fabNewChannelIcon: {
    color: blixtTheme.light,
  },
});

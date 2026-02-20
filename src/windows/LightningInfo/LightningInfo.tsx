import React, { useEffect, useLayoutEffect } from "react";
import { StyleSheet, View } from "react-native";
import { Icon, H1, Fab, Spinner } from "native-base";
import { StackNavigationProp } from "@react-navigation/stack";
import { FlashList } from "@shopify/flash-list";

import { LightningInfoStackParamList } from "./index";
import { useStoreState, useStoreActions } from "../../state/store";
import Container from "../../components/Container";
import ChannelCard from "../../components/ChannelCard";
import PendingChannelCard from "../../components/PendingChannelCard";
import { blixtTheme } from "../../native-base-theme/variables/commonColor";
import { formatBitcoin, valueFiat } from "../../utils/bitcoin-units";
import { NavigationButton } from "../../components/NavigationButton";
import { toast } from "../../utils";

import { useTranslation } from "react-i18next";
import { namespaces } from "../../i18n/i18n.constants";
import {
  Channel,
  PendingChannelsResponse_ClosedChannel,
  PendingChannelsResponse_ForceClosedChannel,
  PendingChannelsResponse_PendingChannel,
  PendingChannelsResponse_PendingOpenChannel,
  PendingChannelsResponse_WaitingCloseChannel,
} from "react-native-turbo-lnd/protos/lightning_pb";

interface ILightningInfoProps {
  navigation: StackNavigationProp<LightningInfoStackParamList, "LightningInfo">;
}
export default function LightningInfo({ navigation }: ILightningInfoProps) {
  const t = useTranslation(namespaces.lightningInfo.lightningInfo).t;
  const rpcReady = useStoreState((store) => store.lightning.rpcReady);
  const aliases = useStoreState((store) => store.channel.aliases);
  const channels = useStoreState((store) => store.channel.channels);
  const pendingOpenChannels = useStoreState((store) => store.channel.pendingOpenChannels);
  const pendingClosingChannels = useStoreState((store) => store.channel.pendingClosingChannels);
  const pendingForceClosingChannels = useStoreState(
    (store) => store.channel.pendingForceClosingChannels,
  );
  const waitingCloseChannels = useStoreState((store) => store.channel.waitingCloseChannels);
  const getChannels = useStoreActions((store) => store.channel.getChannels);
  const bitcoinUnit = useStoreState((store) => store.settings.bitcoinUnit);
  const fiatUnit = useStoreState((store) => store.settings.fiatUnit);
  const currentRate = useStoreState((store) => store.fiat.currentRate);
  const preferFiat = useStoreState((store) => store.settings.preferFiat);
  const changePreferFiat = useStoreActions((store) => store.settings.changePreferFiat);

  async function getChans() {
    (async () => {
      try {
        await getChannels();
      } catch (error) {
        toast(error.message, undefined, "danger", "OK");
      }
    })();
  }

  useEffect(() => {
    if (rpcReady) {
      getChans();
    }
  }, [getChannels, rpcReady]);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerTitle: t("layout.title"),
      headerBackTitle: t("buttons.back", { ns: namespaces.common }),
      headerShown: true,
      headerRight: () => {
        return (
          <NavigationButton onPress={getChans}>
            <Icon type="MaterialIcons" name="sync" style={{ fontSize: 22 }} />
          </NavigationButton>
        );
      },
    });
  }, [navigation]);

  const balance = channels.reduce((accumulator, channel) => {
    return accumulator + channel.localBalance;
    // if (channel.localBalance!.lessThanOrEqual(channel.localChanReserveSat!)) {
    //   return accumulator;
    // }
    // return accumulator.add(channel.localBalance!.sub(channel.localChanReserveSat!));
  }, BigInt(0));

  const channelsArr = [
    ...pendingOpenChannels.map((pendingChannel, i) => ({ ...pendingChannel, type: "pendingOpen" })),
    ...pendingClosingChannels.map((pendingChannel, i) => ({
      ...pendingChannel,
      type: "pendingClose",
    })),
    ...pendingForceClosingChannels.map((pendingChannel, i) => ({
      ...pendingChannel,
      type: "pendingForceClose",
    })),
    ...waitingCloseChannels.map((pendingChannel, i) => ({
      ...pendingChannel,
      type: "waitingForClose",
    })),
    ...channels.map((channel, i) => ({ ...channel, type: "open" })),
  ];

  const onPressBalance = async () => {
    await changePreferFiat(!preferFiat);
  };

  return (
    <Container>
      {rpcReady && (
        <FlashList
          estimatedItemSize={334}
          ListHeaderComponent={
            <View style={style.balanceInfo}>
              <H1 style={[style.spendableAmount]}>{t("balance.title")}</H1>
              <H1 onPress={onPressBalance}>
                {preferFiat
                  ? valueFiat(balance, currentRate).toFixed(2) + " " + fiatUnit
                  : formatBitcoin(balance, bitcoinUnit)}
              </H1>
            </View>
          }
          data={channelsArr}
          renderItem={(info) => {
            if (info.item.type === "pendingOpen") {
              return (
                <PendingChannelCard
                  // key={((pendingChannel?.channel?.channelPoint) ?? "") + i}
                  alias={aliases[info.item?.channel!.remoteNodePub!]}
                  type="OPEN"
                  channel={info.item}
                />
              );
            } else if (info.item.type === "pendingClose") {
              return (
                <PendingChannelCard
                  // key={pendingChannel.closingTxid! + i}
                  alias={aliases[info.item?.channel!.remoteNodePub!]}
                  type="CLOSING"
                  channel={info.item}
                />
              );
            } else if (info.item.type === "pendingForceClose") {
              return (
                <PendingChannelCard
                  // key={pendingChannel.closingTxid! + i}
                  alias={aliases[info.item?.channel!.remoteNodePub!]}
                  type="FORCE_CLOSING"
                  channel={info.item}
                />
              );
            } else if (info.item.type === "waitingForClose") {
              return (
                <PendingChannelCard
                  // key={((pendingChannel?.channel?.channelPoint) ?? "") + i}
                  alias={aliases[info.item.channel?.remoteNodePub ?? ""]}
                  type="WAITING_CLOSE"
                  channel={info.item}
                />
              );
            } else if (info.item.type === "open") {
              return (
                <ChannelCard alias={aliases[info.item.remotePubkey ?? ""]} channel={info.item} />
              );
            }
            return <></>;
          }}
          keyExtractor={(item) => {
            if (item.type === "pendingOpen") {
              return (
                "pendingOpen" +
                (item as PendingChannelsResponse_PendingOpenChannel).channel?.channelPoint
              );
            } else if (item.type === "pendingClose") {
              return (
                "pendingClose" +
                (item as PendingChannelsResponse_ClosedChannel).channel?.channelPoint
              );
            } else if (item.type === "pendingForceClose") {
              return (
                "pendingForceClose" +
                (item as PendingChannelsResponse_ForceClosedChannel).channel?.channelPoint
              );
            } else if (item.type === "waitingForClose") {
              return (
                "waitingForClose" +
                (item as PendingChannelsResponse_WaitingCloseChannel).channel?.channelPoint
              );
            } else if (item.type === "open") {
              return "open" + (item as Channel).channelPoint;
            } else {
              return "unknown";
            }
          }}
          contentContainerStyle={style.container}
        />
      )}
      {!rpcReady && (
        <View style={style.loadingContainer}>
          <Spinner color={blixtTheme.light} />
        </View>
      )}
      <Fab
        style={style.fab}
        position="bottomRight"
        onPress={() => navigation.navigate("OpenChannel", {})}
      >
        <Icon type="Entypo" name="plus" style={style.fabNewChannelIcon} />
      </Fab>
    </Container>
  );
}

const style = StyleSheet.create({
  container: {
    padding: 12,
    paddingBottom: 25,
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

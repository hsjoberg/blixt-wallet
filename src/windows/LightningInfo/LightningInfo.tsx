import React, { useState, useEffect } from "react";
import { StyleSheet, View, ScrollView } from "react-native";
import { Body, Header, Container, Left, Button, Title, Right, Icon, H1, H3, Fab } from "native-base";
import { NavigationScreenProp } from "react-navigation";
import { useStoreState, useStoreActions } from "../../state/store";

import ChannelCard from "../../components/ChannelCard";
import PendingChannelCard from "../../components/PendingChannelCard";
import { blixtTheme } from "../../../native-base-theme/variables/commonColor";

interface ILightningInfoProps {
  navigation: NavigationScreenProp<{}>;
}
export default ({ navigation }: ILightningInfoProps) => {
  const {
    aliases,
    channels,
    pendingOpenChannels,
    pendingClosingChannels,
    pendingForceClosingChannels,
    waitingCloseChannels
  } = useStoreState((store) => store.channel);
  const getChannels = useStoreActions((store) => store.channel.getChannels);
  const [fabActive, setFabActive] = useState(false);

  useEffect(() => {
    (async () => {
      await getChannels(undefined);
    })();
  }, [getChannels]);

  const channelCards = [
    ...pendingOpenChannels.map((pendingChannel, i) => (
      <PendingChannelCard key={i} alias={aliases[pendingChannel.channel!.remoteNodePub]} type="OPEN" channel={pendingChannel} />
    )),
    ...pendingClosingChannels.map((pendingChannel, i) => (
      <PendingChannelCard key={i} alias={aliases[pendingChannel.channel!.remoteNodePub]} type="CLOSING" channel={pendingChannel} />
    )),
    ...pendingForceClosingChannels.map((pendingChannel, i) => (
      <PendingChannelCard key={i} alias={aliases[pendingChannel.channel!.remoteNodePub]} type="FORCE_CLOSING" channel={pendingChannel} />
    )),
    ...waitingCloseChannels.map((pendingChannel, i) => (
      <PendingChannelCard key={i} alias={aliases[pendingChannel.channel!.remoteNodePub]} type="WAITING_CLOSE" channel={pendingChannel} />
    )),
    ...channels.map((channel) => (
      <ChannelCard key={channel.chanId} alias={aliases[channel.remotePubkey]} channel={channel} />
    )),
  ];

  return (
    <Container>
      <Header iosBarStyle="light-content" translucent={false}>
        <Left>
          <Button transparent={true} onPress={() => navigation.navigate("Main")}>
            <Icon name="arrow-back" />
          </Button>
        </Left>
        <Body>
          <Title>Lightning Network</Title>
        </Body>
        <Right>
          <Button transparent={true} onPress={async () => await getChannels(undefined)}>
            <Icon name="sync" />
          </Button>
        </Right>
      </Header>
      <ScrollView contentContainerStyle={style.container}>
        <View style={style.balanceInfo}>
          <H1 style={style.spendableTitle}>Spendable amount</H1>
          <H3 style={style.spendable}>
            {channels.reduce((accumulator, channel) => accumulator + channel.localBalance, 0)}
            &nbsp;satoshi
          </H3>
        </View>
        <View>
          {channelCards}
        </View>
      </ScrollView>
      <Fab
        active={fabActive}
        style={{ backgroundColor: blixtTheme.primary }}
        position="bottomRight"
        onPress={
          () => navigation.navigate("OpenChannel")
        }>
        <Icon type="Entypo" name="plus" style={{ color: blixtTheme.light }} />
      </Fab>
    </Container>
  );
};

const style = StyleSheet.create({
  container: {
    padding: 16,
  },
  balanceInfo: {
    flex: 0.25,
    width: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  spendableTitle: {
    marginBottom: 8,
  },
  spendable: {
  },
});

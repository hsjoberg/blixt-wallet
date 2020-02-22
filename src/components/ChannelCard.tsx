import React from "react";
import { Button, Card, CardItem, Body, Row, Right, Text, Left } from "native-base";

import { useStoreActions, useStoreState } from "../state/store";
import { StyleSheet, Alert } from "react-native";
import { lnrpc } from "../../proto/proto";

export interface IChannelCardProps {
  channel: lnrpc.IChannel;
  alias?: string;
}
export const ChannelCard = ({ channel, alias }: IChannelCardProps) => {
  const closeChannel = useStoreActions((store) => store.channel.closeChannel);
  const getChannels = useStoreActions((store) => store.channel.getChannels);
  const autopilotEnabled = useStoreState((store) => store.settings.autopilotEnabled);
  const changeAutopilotEnabled = useStoreActions((store) => store.settings.changeAutopilotEnabled);
  const setupAutopilot = useStoreActions((store) => store.lightning.setupAutopilot);

  const close = async () => {
    const result = await closeChannel({
      fundingTx: channel.channelPoint!.split(":")[0],
      outputIndex: Number.parseInt(channel.channelPoint!.split(":")[1], 10),
    });
    console.log(result);

    await getChannels(undefined);

    if (autopilotEnabled) {
      Alert.alert(
        "Autopilot",
        "Automatic channel opening is enabled, " +
        "new on-chain funds will automatically go to a new channel unless you disable it.\n\n" +
        "Do you wish to disable automatic channel opening?",
        [
          { text: "No", },
          { text: "Yes", onPress: async () => {
            changeAutopilotEnabled(false);
            setupAutopilot(false);
          },
      }]);
    }
  };

  return (
    <Card style={style.channelCard}>
      <CardItem style={style.channelDetail}>
        <Body>
          <Row>
            <Left>
              <Text style={style.channelDetailTitle}>Node</Text>
            </Left>
            <Right>
              <Text style={style.channelDetailValue}>{channel.remotePubkey}</Text>
            </Right>
          </Row>
          {alias &&
            <Row>
              <Left>
                <Text style={style.channelDetailTitle}>Alias</Text>
              </Left>
              <Right>
                <Text style={style.channelDetailValue}>{alias}</Text>
              </Right>
            </Row>
          }
          <Row>
            <Left>
              <Text style={style.channelDetailTitle}>Status</Text>
            </Left>
            <Right>
              {channel.active ?
                <Text style={{...style.channelDetailValue, color: "green"}}>Active</Text>
                :
                <Text style={{...style.channelDetailValue, color: "red"}}>Inactive</Text>
              }
            </Right>
          </Row>
          <Row>
            <Left>
              <Text style={style.channelDetailTitle}>Amount in channel</Text>
            </Left>
            <Right>
              <Text style={style.channelDetailAmount}>{channel.localBalance!.toString()}/{channel.capacity!.toString()} satoshi</Text>
            </Right>
          </Row>
          <Row>
            <Right>
              <Button style={{ marginTop: 14 }} danger={true} small={true} onPress={close}>
                <Text>Close channel</Text>
              </Button>
            </Right>
          </Row>
        </Body>
      </CardItem>
    </Card>
  );
};

export default ChannelCard;

export const style = StyleSheet.create({
  channelCard: {
    width: "100%",
    marginTop: 8,
  },
  channelDetail: {
  },
  channelDetails: {
    fontSize: 16,
  },
  channelDetailTitle: {
  },
  channelDetailValue: {
  },
  channelDetailAmount: {
    fontSize: 15,
  }
});

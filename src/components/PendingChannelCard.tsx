import React from "react";
import { Body, Text, Left, Right, Card, CardItem, Row, Button } from "native-base";

import { style } from "./ChannelCard";
import { lnrpc } from "../../proto/proto";
import { blixtTheme } from "../native-base-theme/variables/commonColor";
import { useStoreActions } from "../state/store";
import { Debug } from "../utils/build";

export interface IPendingChannelCardProps {
  type: "OPEN" | "CLOSING" | "FORCE_CLOSING" | "WAITING_CLOSE";
  channel: lnrpc.PendingChannelsResponse.IPendingOpenChannel
            | lnrpc.PendingChannelsResponse.IClosedChannel
            | lnrpc.PendingChannelsResponse.IForceClosedChannel
            | lnrpc.PendingChannelsResponse.IWaitingCloseChannel;
  alias?: string;
}
export const PendingChannelCard = ({ channel, type, alias }: IPendingChannelCardProps) => {
  const abandonChannel = useStoreActions((store) => store.channel.abandonChannel);
  const getChannels = useStoreActions((store) => store.channel.getChannels);


  if (!channel.channel) {
    return (<Text>Error</Text>);
  }

  const abandon = async () => {
    const result = await abandonChannel({
      fundingTx: channel.channel!.channelPoint!.split(":")[0],
      outputIndex: Number.parseInt(channel.channel!.channelPoint!.split(":")[1], 10),
    });

    await getChannels(undefined);
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
              <Text style={style.channelDetailValue}>{channel.channel.remoteNodePub}</Text>
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
              {type === "OPEN" &&
                <Text style={{...style.channelDetailValue, color: "orange"}}>Pending</Text>
              }
              {type === "CLOSING" &&
                <Text style={{...style.channelDetailValue, color: blixtTheme.red}}>Closing</Text>
              }
              {type === "FORCE_CLOSING" &&
                <Text style={{...style.channelDetailValue, color: blixtTheme.red}}>Force Closing</Text>
              }
              {type === "WAITING_CLOSE" &&
                <Text style={{...style.channelDetailValue, color: blixtTheme.red}}>Waiting for Close</Text>
              }
            </Right>
          </Row>
          {/* <Row>
            <Left>
              <Text style={style.channelDetailTitle}>Amount in channel</Text>
            </Left>
            <Right>
              <Text style={style.channelDetailAmount}>{channel.channel!.localBalance!.toString()}/{channel.channel!.capacity!.toString()} Satoshi</Text>
            </Right>
          </Row> */}
          {__DEV__ &&
            <Row>
              <Right>
                <Button onPress={() => abandon()} small>
                  <Text>Abandon</Text>
                </Button>
              </Right>
            </Row>
          }
        </Body>
      </CardItem>
    </Card>
  );
};

export default PendingChannelCard;

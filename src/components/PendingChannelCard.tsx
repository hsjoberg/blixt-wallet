import React from "react";
import { Body, Text, Left, Right, Card, CardItem, Row, Button } from "native-base";
import { Image, Linking } from "react-native";

import { style } from "./ChannelCard";
import { lnrpc } from "../../proto/proto";
import { blixtTheme } from "../native-base-theme/variables/commonColor";
import { useStoreActions, useStoreState } from "../state/store";
import { identifyService, lightningServices } from "../utils/lightning-services";
import { OnchainExplorer } from "../state/Settings";

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
  const onchainExplorer = useStoreState((store) => store.settings.onchainExplorer);

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

  const onPressViewInExplorer = async () => {
    const txId = channel.channel?.channelPoint?.split(":")[0];
    await Linking.openURL(`${OnchainExplorer[onchainExplorer]}${txId}`);
  }

  const serviceKey = identifyService(channel.channel.remoteNodePub ?? "", "", null);
  let service;
  if (serviceKey && lightningServices[serviceKey]) {
    service = lightningServices[serviceKey];
  }

  return (
    <Card style={style.channelCard}>
      <CardItem style={style.channelDetail}>
        <Body>
          {alias &&
            <Row style={{ width: "100%" }}>
              <Left style={{ alignSelf: "flex-start" }}>
                <Text style={style.channelDetailTitle}>Alias</Text>
              </Left>
              <Right style={{ flexDirection: "row", alignItems: "flex-start", justifyContent: "flex-end" }}>
                <Text style={style.channelDetailValue}>
                  {alias}
                </Text>
                {service &&
                  <Image
                    source={{ uri: service.image }}
                    style={style.nodeImage}
                    width={28}
                    height={28}
                  />
                }
              </Right>
            </Row>
          }
          <Row>
            <Left>
              <Text style={style.channelDetailTitle}>Node</Text>
            </Left>
            <Right>
              <Text style={{ fontSize: 9.5, textAlign: "right" }}>{channel.channel.remoteNodePub}</Text>
            </Right>
          </Row>
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
          {type === "OPEN" &&
            <Row style={{ width: "100%" }}>
              <Left>
              <Button style={{ marginTop: 14 }} small={true} onPress={onPressViewInExplorer}>
                <Text style={{ fontSize: 8 }}>View in block explorer</Text>
              </Button>
              </Left>
            </Row>
          }
        </Body>
      </CardItem>
    </Card>
  );
};

export default PendingChannelCard;

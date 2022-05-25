import React from "react";
import { Body, Text, Left, Right, Card, CardItem, Row, Button } from "native-base";
import { Image, Linking } from "react-native";
import Long from "long";
import BigNumber from "bignumber.js";

import { style } from "./ChannelCard";
import { lnrpc } from "../../proto/lightning";
import { blixtTheme } from "../native-base-theme/variables/commonColor";
import { useStoreActions, useStoreState } from "../state/store";
import { identifyService, lightningServices } from "../utils/lightning-services";
import { constructOnchainExplorerUrl } from "../utils/onchain-explorer";
import CopyText from "./CopyText";
import { getUnitNice, valueBitcoin, valueFiat } from "../utils/bitcoin-units";

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
  const preferFiat = useStoreState((store) => store.settings.preferFiat);
  const bitcoinUnit = useStoreState((store) => store.settings.bitcoinUnit);
  const fiatUnit = useStoreState((store) => store.settings.fiatUnit);
  const currentRate = useStoreState((store) => store.fiat.currentRate);

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

  const onPressViewInExplorer = async (txId: string) => {
    await Linking.openURL(constructOnchainExplorerUrl(onchainExplorer, txId ?? ""));
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
                <CopyText style={style.channelDetailValue}>
                  {alias}
                </CopyText>
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
              <CopyText style={{ fontSize: 9.5, textAlign: "right" }}>{channel.channel.remoteNodePub}</CopyText>
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
            <>
              <Row style={{ width: "100%" }}>
                <Left>
                  <Text style={style.channelDetailTitle}>Pending funds</Text>
                </Left>
                <Right>
                  <Text>
                    {!preferFiat &&
                      <>
                        <Text>
                          {valueBitcoin((channel as lnrpc.PendingChannelsResponse.IPendingOpenChannel)?.channel.localBalance || new Long(0), bitcoinUnit)}{" "}
                        </Text>
                        <Text>
                          {getUnitNice(new BigNumber((channel as lnrpc.PendingChannelsResponse.IPendingOpenChannel)?.channel.localBalance?.toNumber?.()), bitcoinUnit)}
                        </Text>
                      </>
                    }
                    {preferFiat &&
                      <>
                        <Text>
                          {valueFiat((channel as lnrpc.PendingChannelsResponse.IPendingOpenChannel)?.channel.localBalance || new Long(0), currentRate).toFixed(2)}{" "}
                        </Text>
                        <Text>
                          {fiatUnit}
                        </Text>
                      </>
                    }
                  </Text>
                </Right>
              </Row>
              <Row style={{ width: "100%" }}>
                <Left>
                  <Button style={{ marginTop: 14 }} small={true} onPress={() => {
                    const txId = channel.channel?.channelPoint?.split(":")[0];
                    onPressViewInExplorer(txId ?? "");
                  }}>
                    <Text style={{ fontSize: 8 }}>View in block explorer</Text>
                  </Button>
                </Left>
              </Row>
            </>
          }
          {type === "WAITING_CLOSE" &&
            <>
              <Row style={{ width: "100%" }}>
                <Left>
                  <Text style={style.channelDetailTitle}>Limbo balance</Text>
                </Left>
                <Right>
                  {!preferFiat &&
                    <>
                      <Text>
                        {valueBitcoin((channel as lnrpc.PendingChannelsResponse.IWaitingCloseChannel)?.limboBalance || new Long(0), bitcoinUnit)}{" "}
                        {getUnitNice(new BigNumber((channel as lnrpc.PendingChannelsResponse.IWaitingCloseChannel)?.limboBalance?.toNumber?.()), bitcoinUnit)}
                      </Text>
                    </>
                  }
                  {preferFiat &&
                    <>
                      <Text>
                        {valueFiat((channel as lnrpc.PendingChannelsResponse.IWaitingCloseChannel)?.limboBalance || new Long(0), currentRate).toFixed(2)}{" "}
                        {fiatUnit}
                      </Text>
                    </>
                  }
                </Right>
              </Row>
              <Row style={{ width: "100%" }}>
                <Left>
                  <Text style={style.channelDetailTitle}>Local commitment TXID</Text>
                </Left>
                <Right>
                  <CopyText style={{ fontSize: 9.5, textAlign: "right" }}>
                    {(channel as lnrpc.PendingChannelsResponse.IWaitingCloseChannel)?.commitments?.localTxid || "N/A"}
                  </CopyText>
                </Right>
              </Row>
              <Row style={{ width: "100%" }}>
                <Left>
                  <Text style={style.channelDetailTitle}>Remote commitment TXID</Text>
                </Left>
                <Right>
                  <CopyText style={{ fontSize: 9.5, textAlign: "right" }}>
                    {(channel as lnrpc.PendingChannelsResponse.IWaitingCloseChannel)?.commitments?.remoteTxid || "N/A"}
                  </CopyText>
                </Right>
              </Row>
            </>
          }
          {type === "FORCE_CLOSING" &&
            <>
              <Row style={{ width: "100%" }}>
                <Left>
                  <Text style={style.channelDetailTitle}>Limbo balance</Text>
                </Left>
                <Right>
                  <Text>
                    {!preferFiat &&
                      <>
                        <Text>
                          {valueBitcoin((channel as lnrpc.PendingChannelsResponse.IForceClosedChannel)?.limboBalance || new Long(0), bitcoinUnit)}{" "}
                          {getUnitNice(new BigNumber((channel as lnrpc.PendingChannelsResponse.IForceClosedChannel)?.limboBalance?.toNumber?.()), bitcoinUnit)}
                        </Text>
                      </>
                    }
                    {preferFiat &&
                      <>
                        <Text>
                          {valueFiat((channel as lnrpc.PendingChannelsResponse.IForceClosedChannel)?.limboBalance || new Long(0), currentRate).toFixed(2)}{" "}
                        </Text>
                        <Text>
                          {fiatUnit}
                        </Text>
                      </>
                    }
                  </Text>
                </Right>
              </Row>
              <Row style={{ width: "100%" }}>
                <Left>
                  <Text style={style.channelDetailTitle}>Pending HTLCs</Text>
                </Left>
                <Right>
                  <CopyText style={{ textAlign: "right" }}>
                    {(channel as lnrpc.PendingChannelsResponse.IForceClosedChannel)?.pendingHtlcs?.length.toString()}
                  </CopyText>
                </Right>
              </Row>
              {(channel as lnrpc.PendingChannelsResponse.ForceClosedChannel).maturityHeight !== 0 &&
                <Row style={{ width: "100%" }}>
                  <Left>
                    <Text style={style.channelDetailTitle}>Maturity height</Text>
                  </Left>
                  <Right>
                    <CopyText style={{  textAlign: "right" }}>
                      {(channel as lnrpc.PendingChannelsResponse.IForceClosedChannel)?.maturityHeight?.toString()}
                    </CopyText>
                  </Right>
                </Row>
              }
              <Row style={{ width: "100%" }}>
                <Left>
                  <Button style={{ marginTop: 14 }} small={true} onPress={(() => onPressViewInExplorer((channel as lnrpc.PendingChannelsResponse.ClosedChannel).closingTxid))}>
                    <Text style={{ fontSize: 8 }}>View in block explorer</Text>
                  </Button>
                </Left>
              </Row>
            </>
          }
          {type === "CLOSING" &&
            <>
              <Row style={{ width: "100%" }}>
                <Left>
                  <Button style={{ marginTop: 14 }} small={true} onPress={(() => onPressViewInExplorer((channel as lnrpc.PendingChannelsResponse.IClosedChannel)?.closingTxid))}>
                    <Text style={{ fontSize: 8 }}>View in block explorer</Text>
                  </Button>
                </Left>
              </Row>
            </>
          }
        </Body>
      </CardItem>
    </Card>
  );
};

export default PendingChannelCard;

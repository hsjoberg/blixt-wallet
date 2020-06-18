import React from "react";
import { StyleSheet, Alert } from "react-native";
import { Button, Card, CardItem, Body, Row, Right, Text, Left } from "native-base";
import { Svg, Line, G, Circle, Polyline } from "react-native-svg";
import Long from "long";

import { useStoreActions, useStoreState } from "../state/store";
import { lnrpc } from "../../proto/proto";
import * as nativeBaseTheme from "../../native-base-theme/variables/commonColor";
import { formatBitcoin, valueBitcoin, getUnitNice, valueFiat } from "../utils/bitcoin-units";
import BigNumber from "bignumber.js";
const theme = nativeBaseTheme.default;
const blixtTheme = nativeBaseTheme.blixtTheme;

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
  const bitcoinUnit = useStoreState((store) => store.settings.bitcoinUnit);
  const fiatUnit = useStoreState((store) => store.settings.fiatUnit);
  const currentRate = useStoreState((store) => store.fiat.currentRate);
  const preferFiat = useStoreState((store) => store.settings.preferFiat);

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

  const localBalance = channel.localBalance || Long.fromValue(0);
  const remoteBalance = channel.remoteBalance || Long.fromValue(0);
  const percentageLocal = localBalance.mul(100).div(channel.capacity!).toNumber() / 100;
  const percentageRemote = remoteBalance.mul(100).div(channel.capacity!).toNumber() / 100;
  const percentageReverse = 1 - (percentageLocal + percentageRemote);

  return (
    <Card style={style.channelCard}>
      <CardItem style={style.channelDetail}>
        <Body>
          <Row>
            <Left style={{ alignSelf:"flex-start" }}>
              <Text style={style.channelDetailTitle}>Node</Text>
            </Left>
            <Right>
              <Text style={style.channelDetailValue}>{channel.remotePubkey}</Text>
            </Right>
          </Row>
          {alias &&
            <Row>
              <Left style={{ alignSelf:"flex-start" }}>
                <Text style={style.channelDetailTitle}>Alias</Text>
              </Left>
              <Right>
                <Text style={style.channelDetailValue}>{alias}</Text>
              </Right>
            </Row>
          }
          <Row>
            <Left style={{ alignSelf:"flex-start" }}>
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
          {/* <Row>
            <Left style={{ alignSelf:"flex-start" }}>
              <Text style={style.channelDetailTitle}>Amount in channel</Text>
            </Left>
            <Right>
              <Text style={style.channelDetailAmount}>{channel.localBalance!.toString()}/{channel.capacity!.toString()} satoshi</Text>
            </Right>
          </Row> */}
          <Row>
            <Left style={{ alignSelf:"flex-start" }}>
              <Text>Capacity</Text>
            </Left>
            <Right>
              <Svg width="100" height="22">
                <Line
                  x1="0"
                  y1="15"
                  x2={100 * percentageLocal}
                  y2="15"
                  stroke={blixtTheme.green}
                  strokeWidth="8"
                />
                <Line
                  x1={100 * percentageLocal}
                  y1="15"
                  x2={(100 * percentageLocal) + (100 * percentageRemote)}
                  y2="15"
                  stroke={blixtTheme.red}
                  strokeWidth="8"
                />
                <Line
                  x1={(100 * percentageLocal) + (100 * percentageRemote)}
                  y1="15"
                  x2={(100 * percentageLocal) + (100 * percentageRemote) + (100 * percentageReverse)}
                  y2="15"
                  stroke={blixtTheme.lightGray}
                  strokeWidth="8"
                />
              </Svg>
            </Right>
          </Row>
          <Row>
            <Left style={{ alignSelf:"flex-start" }}>
              <Text>Can send</Text>
            </Left>
            <Right>
              <Text>
                {!preferFiat &&
                  <>
                    <Text style={{ color: blixtTheme.green }}>
                      {valueBitcoin(localBalance, bitcoinUnit)}{" "}
                    </Text>
                    <Text>
                      {getUnitNice(new BigNumber(localBalance.toNumber()), bitcoinUnit)}
                    </Text>
                  </>
                }
                {preferFiat &&
                  <>
                    <Text style={{ color: blixtTheme.green }}>
                      {valueFiat(localBalance, currentRate).toFixed(2)}{" "}
                    </Text>
                    <Text>
                      {fiatUnit}
                    </Text>
                  </>
                }
              </Text>
            </Right>
          </Row>
          <Row>
            <Left style={{ alignSelf:"flex-start" }}>
              <Text>Can receive</Text>
            </Left>
            <Right>
              <Text style={{ textAlign: "right" }}>
                {!preferFiat &&
                  <>
                    <Text style={{ color: blixtTheme.red }}>
                      {valueBitcoin(remoteBalance, bitcoinUnit)}{" "}
                    </Text>
                    <Text>
                      {getUnitNice(new BigNumber(remoteBalance.toNumber()), bitcoinUnit)}
                    </Text>
                  </>
                }
                {preferFiat &&
                  <>
                    <Text style={{ color: blixtTheme.red}}>
                      {valueFiat(remoteBalance, currentRate).toFixed(2)}{" "}
                    </Text>
                    <Text>
                      {fiatUnit}
                    </Text>
                  </>
                }
              </Text>
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

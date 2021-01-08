import React from "react";
import { StyleSheet, Alert } from "react-native";
import { Button, Card, CardItem, Body, Row, Right, Text, Left } from "native-base";
import { Svg, Line } from "react-native-svg";
import Long from "long";

import { useStoreActions, useStoreState } from "../state/store";
import { lnrpc } from "../../proto/proto";
import * as nativeBaseTheme from "../native-base-theme/variables/commonColor";
import { valueBitcoin, getUnitNice, valueFiat } from "../utils/bitcoin-units";
import BigNumber from "bignumber.js";
const blixtTheme = nativeBaseTheme.blixtTheme;

export interface IChannelCardProps {
  channel: lnrpc.IChannel;
  alias?: string;
}
export function ChannelCard({ channel, alias }: IChannelCardProps) {
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

  let localBalance = channel.localBalance || Long.fromValue(0);
  if (localBalance.lessThanOrEqual(channel.localChanReserveSat!)) {
    localBalance = Long.fromValue(0);
  }
  else {
    localBalance = localBalance.sub(channel.localChanReserveSat!);
  }
  const remoteBalance = channel.remoteBalance || Long.fromValue(0);
  const percentageLocal = localBalance.mul(100).div(channel.capacity!).toNumber() / 100;
  const percentageRemote = remoteBalance.mul(100).div(channel.capacity!).toNumber() / 100;
  const percentageReverse = 1 - (percentageLocal + percentageRemote);

  const localReserve = Long.fromValue(
    Math.min(channel.localBalance ? channel.localBalance.toNumber() : 0, channel.localChanReserveSat?.toNumber() ?? 0)
  );

  return (
    <Card style={style.channelCard}>
      <CardItem style={style.channelDetail}>
        <Body>
          <Row style={{ width: "100%" }}>
            <Left style={{ alignSelf: "flex-start" }}>
              <Text style={style.channelDetailTitle}>Node</Text>
            </Left>
            <Right>
              <Text style={style.channelDetailValue}>{channel.remotePubkey}</Text>
            </Right>
          </Row>
          {alias &&
            <Row style={{ width: "100%" }}>
              <Left style={{ alignSelf: "flex-start" }}>
                <Text style={style.channelDetailTitle}>Alias</Text>
              </Left>
              <Right>
                <Text style={style.channelDetailValue}>{alias}</Text>
              </Right>
            </Row>
          }
          <Row style={{ width: "100%" }}>
            <Left style={{ alignSelf: "flex-start" }}>
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
          <Row style={{ width: "100%" }}>
            <Left style={{ alignSelf: "flex-start" }}>
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
          <Row style={{ width: "100%" }}>
            <Left style={{ alignSelf: "flex-start" }}>
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
          <Row style={{ width: "100%" }}>
            <Left style={{ alignSelf: "flex-start" }}>
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
          <Row style={{ width: "100%" }}>
            <Left style={{ alignSelf: "flex-start" }}>
              <Text>Local reserve</Text>
            </Left>
            <Right>
              <Text>
                {!preferFiat &&
                  <>
                    <Text>
                      {localReserve.eq(channel.localChanReserveSat!) &&
                        <>{valueBitcoin(localReserve, bitcoinUnit)}{" "}</>
                      }
                      {localReserve.neq(channel.localChanReserveSat!) &&
                        <>
                          {valueBitcoin(localReserve, bitcoinUnit)}
                          /
                          {valueBitcoin(channel.localChanReserveSat!, bitcoinUnit)}{" "}
                        </>
                      }

                    </Text>
                    <Text>
                      {getUnitNice(new BigNumber(localReserve.toNumber()), bitcoinUnit)}
                    </Text>
                  </>
                }
                {preferFiat &&
                  <>
                    <Text>
                      {localReserve.eq(channel.localChanReserveSat!) &&
                        <>{valueFiat(localReserve, currentRate).toFixed(2)}{" "}</>
                      }
                      {localReserve.neq(channel.localChanReserveSat!) &&
                        <>
                          {valueFiat(localReserve, currentRate).toFixed(2)}
                          /
                          {valueFiat(channel.localChanReserveSat!, currentRate).toFixed(2)}{" "}
                        </>
                      }
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

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

import { useTranslation } from "react-i18next";
import { namespaces } from "../i18n/i18n.constants";
import { Alert } from "../utils/alert";

const dataLossChannelState = "ChanStatusLocalDataLoss|ChanStatusRestored";

export interface IPendingChannelCardProps {
  type: "OPEN" | "CLOSING" | "FORCE_CLOSING" | "WAITING_CLOSE";
  channel:
    | lnrpc.PendingChannelsResponse.IPendingOpenChannel
    | lnrpc.PendingChannelsResponse.IClosedChannel
    | lnrpc.PendingChannelsResponse.IForceClosedChannel
    | lnrpc.PendingChannelsResponse.IWaitingCloseChannel;
  alias?: string;
}
export const PendingChannelCard = ({ channel, type, alias }: IPendingChannelCardProps) => {
  const t = useTranslation(namespaces.lightningInfo.lightningInfo).t;
  const abandonChannel = useStoreActions((store) => store.channel.abandonChannel);
  const closeChannel = useStoreActions((store) => store.channel.closeChannel);
  const bumpFee = useStoreActions((store) => store.onChain.bumpFee);
  const getChannels = useStoreActions((store) => store.channel.getChannels);
  const onchainExplorer = useStoreState((store) => store.settings.onchainExplorer);
  const preferFiat = useStoreState((store) => store.settings.preferFiat);
  const bitcoinUnit = useStoreState((store) => store.settings.bitcoinUnit);
  const fiatUnit = useStoreState((store) => store.settings.fiatUnit);
  const currentRate = useStoreState((store) => store.fiat.currentRate);

  if (!channel.channel) {
    return <Text>Error</Text>;
  }
  const closingChannel = channel as lnrpc.PendingChannelsResponse.IWaitingCloseChannel;

  const isForceClosableChannel =
    channel.channel?.chanStatusFlags === dataLossChannelState || !!closingChannel.closingTxid
      ? false
      : true;

  const forceClose = (channel: lnrpc.PendingChannelsResponse.IWaitingCloseChannel) => {
    if (channel.channel?.chanStatusFlags === dataLossChannelState) {
      Alert.alert("Cannot Force Close A Channel In Recovery State");
      return;
    }

    if (!!channel.closingTxid || channel.closingTxid !== "") {
      Alert.alert("Closing Tx Has Already Been Broadcasted");
      return;
    }

    Alert.alert(
      t("channel.closeChannelPrompt.title"),
      `Are you sure you want to force close the channel${alias ? ` with ${alias}` : ""}?`,
      [
        {
          style: "cancel",
          text: "No",
        },
        {
          style: "default",
          text: "Yes",
          onPress: async () => {
            try {
              const channelPoint = channel.channel?.channelPoint || undefined;

              if (!channelPoint) {
                return;
              }

              const result = await closeChannel({
                fundingTx: channelPoint.split(":")[0],
                outputIndex: Number.parseInt(channelPoint.split(":")[1], 10),
                force: true,
              });

              Alert.alert("Force Closed Channel");
            } catch (err) {
              console.log(err);
              Alert.alert("Failed To Close PendingChannel");
            }
          },
        },
      ],
    );
  };

  const bumpChannelFee = async (
    channel:
      | lnrpc.PendingChannelsResponse.IPendingOpenChannel
      | lnrpc.PendingChannelsResponse.IWaitingCloseChannel,
  ) => {
    if (!channel.channel || !channel.channel.channelPoint) {
      Alert.alert("Missing channel point in pending transaction");
      return;
    }

    const [txid, index] = channel.channel?.channelPoint?.split(":");

    Alert.alert('Fee rate', 'Enter fee rate in sat/vB', [
      {
        text: 'Cancel',
        style: 'cancel',
      },
      {
        text: 'OK',
        onPress: async (text) => {
          const feeRate = Number(text);

          if (isNaN(feeRate)) {
            Alert.alert('Invalid fee rate');
            return;
          }

          const result = await bumpFee({
            feeRate,
            index: Number(index),
            txid,
          });
      
          console.log(result);
        },
      },
    ]);


  };

  const abandon = async () => {
    const result = await abandonChannel({
      fundingTx: channel.channel!.channelPoint!.split(":")[0],
      outputIndex: Number.parseInt(channel.channel!.channelPoint!.split(":")[1], 10),
      force: false,
    });

    await getChannels(undefined);
  };

  const onPressViewInExplorer = async (txId: string) => {
    await Linking.openURL(constructOnchainExplorerUrl(onchainExplorer, txId ?? ""));
  };

  const serviceKey = identifyService(channel.channel.remoteNodePub ?? "", "", null);
  let service;
  if (serviceKey && lightningServices[serviceKey]) {
    service = lightningServices[serviceKey];
  }

  return (
    <Card style={style.channelCard}>
      <CardItem style={style.channelDetail}>
        <Body>
          {alias && (
            <Row style={{ width: "100%" }}>
              <Left style={{ alignSelf: "flex-start" }}>
                <Text style={style.channelDetailTitle}>{t("channel.alias")}</Text>
              </Left>
              <Right
                style={{
                  flexDirection: "row",
                  alignItems: "flex-start",
                  justifyContent: "flex-end",
                }}
              >
                <CopyText style={style.channelDetailValue}>{alias}</CopyText>
                {service && (
                  <Image
                    source={{ uri: service.image }}
                    style={style.nodeImage}
                    width={28}
                    height={28}
                  />
                )}
              </Right>
            </Row>
          )}
          <Row style={{ width: "100%" }}>
            <Left>
              <Text style={style.channelDetailTitle}>{t("channel.node")}</Text>
            </Left>
            <Right>
              <CopyText style={{ fontSize: 9.5, textAlign: "right" }}>
                {channel.channel.remoteNodePub}
              </CopyText>
            </Right>
          </Row>
          <Row style={{ width: "100%" }}>
            <Left>
              <Text style={style.channelDetailTitle}>{t("channel.status")}</Text>
            </Left>
            <Right>
              {type === "OPEN" && (
                <Text style={{ ...style.channelDetailValue, color: "orange" }}>
                  {t("channel.statusPending")}
                </Text>
              )}
              {type === "CLOSING" && (
                <Text style={{ ...style.channelDetailValue, color: blixtTheme.red }}>
                  {t("channel.statusClosing")}
                </Text>
              )}
              {type === "FORCE_CLOSING" && (
                <Text style={{ ...style.channelDetailValue, color: blixtTheme.red }}>
                  {t("channel.statusForceClosing")}
                </Text>
              )}
              {type === "WAITING_CLOSE" && (
                <Text style={{ ...style.channelDetailValue, color: blixtTheme.red }}>
                  {t("channel.statusWaitingForClose")}
                </Text>
              )}
            </Right>
          </Row>
          {type === "OPEN" && (
            <>
              <Row style={{ width: "100%" }}>
                <Left>
                  <Text style={style.channelDetailTitle}>{t("channel.pendingFunds")}</Text>
                </Left>
                <Right>
                  <Text>
                    {!preferFiat && (
                      <>
                        <Text>
                          {valueBitcoin(
                            (channel as lnrpc.PendingChannelsResponse.IPendingOpenChannel)?.channel
                              .localBalance || new Long(0),
                            bitcoinUnit,
                          )}{" "}
                        </Text>
                        <Text>
                          {getUnitNice(
                            new BigNumber(
                              (
                                channel as lnrpc.PendingChannelsResponse.IPendingOpenChannel
                              )?.channel.localBalance?.toNumber?.(),
                            ),
                            bitcoinUnit,
                          )}
                        </Text>
                      </>
                    )}
                    {preferFiat && (
                      <>
                        <Text>
                          {valueFiat(
                            (channel as lnrpc.PendingChannelsResponse.IPendingOpenChannel)?.channel
                              .localBalance || new Long(0),
                            currentRate,
                          ).toFixed(2)}{" "}
                        </Text>
                        <Text>{fiatUnit}</Text>
                      </>
                    )}
                  </Text>
                </Right>
                <Row style={{ width: "100%" }}>
                  <Left>
                    <Button
                      style={{ marginTop: 14 }}
                      danger={true}
                      small={true}
                      onPress={() => bumpChannelFee(channel)}
                    >
                      <Text style={{ fontSize: 8 }}>{"bump fee"}</Text>
                    </Button>
                  </Left>
                </Row>
              </Row>
              <Row style={{ width: "100%" }}>
                <Left>
                  <Button
                    style={{ marginTop: 14 }}
                    small={true}
                    onPress={() => {
                      const txId = channel.channel?.channelPoint?.split(":")[0];
                      onPressViewInExplorer(txId ?? "");
                    }}
                  >
                    <Text style={{ fontSize: 8 }}>
                      {t("generic.viewInBlockExplorer", { ns: namespaces.common })}
                    </Text>
                  </Button>
                </Left>
              </Row>
            </>
          )}
          {type === "WAITING_CLOSE" && (
            <>
              <Row style={{ width: "100%" }}>
                <Left>
                  <Text style={style.channelDetailTitle}>{t("channel.balanceInLimbo")}</Text>
                </Left>
                <Right>
                  {!preferFiat && (
                    <>
                      <Text>
                        {valueBitcoin(
                          (channel as lnrpc.PendingChannelsResponse.IWaitingCloseChannel)
                            ?.limboBalance || new Long(0),
                          bitcoinUnit,
                        )}{" "}
                        {getUnitNice(
                          new BigNumber(
                            (
                              channel as lnrpc.PendingChannelsResponse.IWaitingCloseChannel
                            )?.limboBalance?.toNumber?.(),
                          ),
                          bitcoinUnit,
                        )}
                      </Text>
                    </>
                  )}
                  {preferFiat && (
                    <>
                      <Text>
                        {valueFiat(
                          (channel as lnrpc.PendingChannelsResponse.IWaitingCloseChannel)
                            ?.limboBalance || new Long(0),
                          currentRate,
                        ).toFixed(2)}{" "}
                        {fiatUnit}
                      </Text>
                    </>
                  )}
                </Right>
              </Row>
              <Row style={{ width: "100%" }}>
                <Left>
                  <Text style={style.channelDetailTitle}>{t("channel.localCommitmentTxid")}</Text>
                </Left>
                <Right>
                  <CopyText style={{ fontSize: 9.5, textAlign: "right" }}>
                    {(channel as lnrpc.PendingChannelsResponse.IWaitingCloseChannel)?.commitments
                      ?.localTxid || "N/A"}
                  </CopyText>
                </Right>
              </Row>
              <Row style={{ width: "100%" }}>
                <Left>
                  <Text style={style.channelDetailTitle}>{t("channel.remoteCommitmentTxid")}</Text>
                </Left>
                <Right>
                  <CopyText style={{ fontSize: 9.5, textAlign: "right" }}>
                    {(channel as lnrpc.PendingChannelsResponse.IWaitingCloseChannel)?.commitments
                      ?.remoteTxid || "N/A"}
                  </CopyText>
                </Right>
              </Row>
              <Row style={{ width: "100%" }}>
                <Left>
                  <Button
                    style={{ marginTop: 14 }}
                    danger={true}
                    small={true}
                    onPress={() => bumpChannelFee(channel)}
                  >
                    <Text style={{ fontSize: 8 }}>{"bump fee"}</Text>
                  </Button>
                </Left>
              </Row>
              {isForceClosableChannel === true && (
                <Row style={{ width: "100%" }}>
                  <Left>
                    <Button
                      style={{ marginTop: 14 }}
                      danger={true}
                      small={true}
                      onPress={() => forceClose(channel)}
                    >
                      <Text style={{ fontSize: 8 }}>{t("channel.forceClosePendingChannel")}</Text>
                    </Button>
                  </Left>
                </Row>
              )}
              {!!(channel as lnrpc.PendingChannelsResponse.IWaitingCloseChannel)?.closingTxid && (
                <Row style={{ width: "100%" }}>
                  <Left>
                    <Button
                      style={{ marginTop: 14 }}
                      small={true}
                      onPress={() =>
                        onPressViewInExplorer(
                          (channel as lnrpc.PendingChannelsResponse.ClosedChannel).closingTxid,
                        )
                      }
                    >
                      <Text style={{ fontSize: 8 }}>
                        {t("generic.viewInBlockExplorer", { ns: namespaces.common })}
                      </Text>
                    </Button>
                  </Left>
                </Row>
              )}
            </>
          )}
          {type === "FORCE_CLOSING" && (
            <>
              <Row style={{ width: "100%" }}>
                <Left>
                  <Text style={style.channelDetailTitle}>{t("channel.balanceInLimbo")}</Text>
                </Left>
                <Right>
                  <Text>
                    {!preferFiat && (
                      <>
                        <Text>
                          {valueBitcoin(
                            (channel as lnrpc.PendingChannelsResponse.IForceClosedChannel)
                              ?.limboBalance || new Long(0),
                            bitcoinUnit,
                          )}{" "}
                          {getUnitNice(
                            new BigNumber(
                              (
                                channel as lnrpc.PendingChannelsResponse.IForceClosedChannel
                              )?.limboBalance?.toNumber?.(),
                            ),
                            bitcoinUnit,
                          )}
                        </Text>
                      </>
                    )}
                    {preferFiat && (
                      <>
                        <Text>
                          {valueFiat(
                            (channel as lnrpc.PendingChannelsResponse.IForceClosedChannel)
                              ?.limboBalance || new Long(0),
                            currentRate,
                          ).toFixed(2)}{" "}
                        </Text>
                        <Text>{fiatUnit}</Text>
                      </>
                    )}
                  </Text>
                </Right>
              </Row>
              <Row style={{ width: "100%" }}>
                <Left>
                  <Text style={style.channelDetailTitle}>{t("channel.pendingHtlcs")}</Text>
                </Left>
                <Right>
                  <CopyText style={{ textAlign: "right" }}>
                    {(
                      channel as lnrpc.PendingChannelsResponse.IForceClosedChannel
                    )?.pendingHtlcs?.length.toString()}
                  </CopyText>
                </Right>
              </Row>
              {(channel as lnrpc.PendingChannelsResponse.ForceClosedChannel).maturityHeight !==
                0 && (
                <Row style={{ width: "100%" }}>
                  <Left>
                    <Text style={style.channelDetailTitle}>{t("channel.maturityHeight")}</Text>
                  </Left>
                  <Right>
                    <CopyText style={{ textAlign: "right" }}>
                      {(
                        channel as lnrpc.PendingChannelsResponse.IForceClosedChannel
                      )?.maturityHeight?.toString()}
                    </CopyText>
                  </Right>
                </Row>
              )}
              <Row style={{ width: "100%" }}>
                <Left>
                  <Button
                    style={{ marginTop: 14 }}
                    small={true}
                    onPress={() =>
                      onPressViewInExplorer(
                        (channel as lnrpc.PendingChannelsResponse.ClosedChannel).closingTxid,
                      )
                    }
                  >
                    <Text style={{ fontSize: 8 }}>
                      {t("generic.viewInBlockExplorer", { ns: namespaces.common })}
                    </Text>
                  </Button>
                </Left>
              </Row>
            </>
          )}
          {type === "CLOSING" && (
            <>
              <Row style={{ width: "100%" }}>
                <Left>
                  <Button
                    style={{ marginTop: 14 }}
                    small={true}
                    onPress={() =>
                      onPressViewInExplorer(
                        (channel as lnrpc.PendingChannelsResponse.IClosedChannel)?.closingTxid,
                      )
                    }
                  >
                    <Text style={{ fontSize: 8 }}>
                      {t("generic.viewInBlockExplorer", { ns: namespaces.common })}
                    </Text>
                  </Button>
                </Left>
              </Row>
            </>
          )}
        </Body>
      </CardItem>
    </Card>
  );
};

export default PendingChannelCard;

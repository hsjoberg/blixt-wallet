import React, { useMemo } from "react";
import { Body, Text, Left, Right, Card, CardItem, Row } from "native-base";
import { Button } from "./Button";
import { Image, Linking } from "react-native";
import BigNumber from "bignumber.js";

import { style } from "./ChannelCard";
import { blixtTheme } from "../native-base-theme/variables/commonColor";
import { useStoreActions, useStoreState } from "../state/store";
import { identifyService, lightningServices } from "../utils/lightning-services";
import { constructOnchainExplorerUrl } from "../utils/onchain-explorer";
import CopyText from "./CopyText";
import { getUnitNice, valueBitcoin, valueFiat } from "../utils/bitcoin-units";

import { useTranslation } from "react-i18next";
import { namespaces } from "../i18n/i18n.constants";
import { Alert } from "../utils/alert";

import {
  Initiator,
  PendingChannelsResponse_ClosedChannel,
  PendingChannelsResponse_ForceClosedChannel,
  PendingChannelsResponse_PendingChannel,
  PendingChannelsResponse_PendingOpenChannel,
  PendingChannelsResponse_WaitingCloseChannel,
} from "react-native-turbo-lnd/protos/lightning_pb";

const dataLossChannelState = "ChanStatusLocalDataLoss|ChanStatusRestored";

export interface IPendingChannelCardProps {
  type: "OPEN" | "CLOSING" | "FORCE_CLOSING" | "WAITING_CLOSE";
  channel:
    | PendingChannelsResponse_PendingOpenChannel
    | PendingChannelsResponse_ClosedChannel
    | PendingChannelsResponse_ForceClosedChannel
    | PendingChannelsResponse_WaitingCloseChannel;
  // TURBOTODO: no PendingChannelsResponse_PendingChannel?
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
  const onchainTransactions = useStoreState((store) => store.onChain.transactions);

  if (!channel.channel) {
    return <Text>Error</Text>;
  }
  const closingChannel = channel as PendingChannelsResponse_WaitingCloseChannel;

  const isForceClosableChannel =
    channel.channel?.chanStatusFlags === dataLossChannelState || !!closingChannel.closingTxid
      ? false
      : true;

  const forceClose = (channel: PendingChannelsResponse_WaitingCloseChannel) => {
    if (channel.channel?.chanStatusFlags === dataLossChannelState) {
      Alert.alert("Cannot Force Close A Channel In Recovery State");
      return;
    }

    if (!!channel.closingTxid && channel.closingTxid !== "") {
      Alert.alert(`Closing Tx Has Already Been Broadcasted:\n${channel.closingTxid}`);
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

  const bumpChannelFee = async (channel: PendingChannelsResponse_PendingOpenChannel) => {
    if (!channel.channel || !channel.channel.channelPoint) {
      Alert.alert(t("msg.error", { ns: namespaces.common }));
      return;
    }

    const [txid, index] = channel.channel.channelPoint.split(":");

    Alert.prompt(t("channel.bumpFee"), t("channel.bumpFeeAlerts.enterFeeRate"), [
      {
        text: t("buttons.cancel", { ns: namespaces.common }),
        style: "cancel",
        onPress: () => {},
      },
      {
        text: "OK",
        onPress: async (feeRate) => {
          if (!feeRate) {
            Alert.alert(t("channel.bumpFeeAlerts.missingFeeRate"));
            return;
          }

          const feeRateNumber = Number.parseInt(feeRate);
          const childIndex = Number.parseInt(index === "0" ? "1" : "0");

          if (isNaN(feeRateNumber)) {
            Alert.alert(t("channel.bumpFeeAlerts.invalidFeeRate"));
            return;
          }

          try {
            await bumpFee({
              feeRate: feeRateNumber,
              index: childIndex,
              txid,
            });

            Alert.alert(t("channel.bumpFeeAlerts.bumpFeeSuccess"));
          } catch (err) {
            Alert.alert(t("channel.bumpFeeAlerts.bumpFeeFailed"), err);
            console.error("Fee bump failed", err);
          }
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

  let isFeeBumpable = useMemo(() => {
    for (const onchainTransaction of onchainTransactions) {
      if (onchainTransaction.txHash == channel?.channel?.channelPoint?.split(":")[0]) {
        if (onchainTransaction.destAddresses && onchainTransaction.destAddresses.length > 1) {
          return true;
        }
      }
    }
    return false;
  }, [channel]);

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
                        <Text>{valueBitcoin(channel.channel.localBalance, bitcoinUnit)} </Text>
                        <Text>
                          {getUnitNice(
                            new BigNumber(channel.channel.localBalance.toString()),
                            bitcoinUnit,
                          )}
                        </Text>
                      </>
                    )}
                    {preferFiat && (
                      <>
                        <Text>
                          {valueFiat(channel.channel.localBalance, currentRate).toFixed(2)}{" "}
                        </Text>
                        <Text>{fiatUnit}</Text>
                      </>
                    )}
                  </Text>
                </Right>
              </Row>
              <Row style={{ width: "100%" }}>
                <Left style={{ flexDirection: "row" }}>
                  {channel.channel.initiator === Initiator["INITIATOR_LOCAL"] &&
                    isFeeBumpable === true && (
                      <Button
                        style={{ marginTop: 14 }}
                        danger={true}
                        small={true}
                        onPress={() =>
                          bumpChannelFee(channel as PendingChannelsResponse_PendingOpenChannel)
                        }
                      >
                        <Text style={{ fontSize: 8 }}>{t("channel.bumpFee")}</Text>
                      </Button>
                    )}

                  <Button
                    style={{ marginTop: 14, marginLeft: isFeeBumpable ? 10 : 0 }}
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
                          (channel as PendingChannelsResponse_WaitingCloseChannel).limboBalance,
                          bitcoinUnit,
                        )}{" "}
                        {getUnitNice(
                          new BigNumber(
                            (
                              channel as PendingChannelsResponse_WaitingCloseChannel
                            ).limboBalance.toString(),
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
                          (channel as PendingChannelsResponse_WaitingCloseChannel).limboBalance,
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
                    {(channel as PendingChannelsResponse_WaitingCloseChannel).commitments
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
                    {(channel as PendingChannelsResponse_WaitingCloseChannel).commitments
                      ?.remoteTxid || "N/A"}
                  </CopyText>
                </Right>
              </Row>
              {isForceClosableChannel === true && (
                <Row style={{ width: "100%" }}>
                  <Left>
                    <Button
                      style={{ marginTop: 14 }}
                      danger={true}
                      small={true}
                      onPress={() =>
                        forceClose(channel as PendingChannelsResponse_WaitingCloseChannel)
                      }
                    >
                      <Text style={{ fontSize: 8 }}>{t("channel.forceClosePendingChannel")}</Text>
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
                            (channel as PendingChannelsResponse_ForceClosedChannel).limboBalance,
                            bitcoinUnit,
                          )}{" "}
                          {getUnitNice(
                            new BigNumber(
                              (
                                channel as PendingChannelsResponse_ForceClosedChannel
                              ).limboBalance.toString(),
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
                            (channel as PendingChannelsResponse_ForceClosedChannel).limboBalance,
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
                      channel as PendingChannelsResponse_ForceClosedChannel
                    ).pendingHtlcs.length.toString()}
                  </CopyText>
                </Right>
              </Row>
              {(channel as PendingChannelsResponse_ForceClosedChannel).maturityHeight !== 0 && (
                <Row style={{ width: "100%" }}>
                  <Left>
                    <Text style={style.channelDetailTitle}>{t("channel.maturityHeight")}</Text>
                  </Left>
                  <Right>
                    <CopyText style={{ textAlign: "right" }}>
                      {(
                        channel as PendingChannelsResponse_ForceClosedChannel
                      ).maturityHeight.toString()}
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
                        (channel as PendingChannelsResponse_ForceClosedChannel).closingTxid,
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
                        (channel as PendingChannelsResponse_ClosedChannel).closingTxid,
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

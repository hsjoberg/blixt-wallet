import * as nativeBaseTheme from "../native-base-theme/variables/commonColor";

import { Image, Linking, StyleSheet } from "react-native";
import { Body, Card, CardItem, Icon, Left, Right, Row, Text, View } from "native-base";
import { Line, Svg } from "react-native-svg";
import { Menu, MenuOptions, MenuOption, MenuTrigger } from "react-native-popup-menu";
import { getUnitNice, valueBitcoin, valueFiat } from "../utils/bitcoin-units";
import { identifyService, lightningServices } from "../utils/lightning-services";
import { useStoreActions, useStoreState } from "../state/store";

import BigNumber from "bignumber.js";
import CopyText from "./CopyText";
import Long from "long";
import React, { useState } from "react";
import { constructOnchainExplorerUrl } from "../utils/onchain-explorer";
import { lnrpc } from "../../proto/lightning";
import { namespaces } from "../i18n/i18n.constants";
import { toast } from "../utils";
import { useTranslation } from "react-i18next";
import { Alert } from "../utils/alert";
import { PLATFORM } from "../utils/constants";

const blixtTheme = nativeBaseTheme.blixtTheme;

export interface IChannelCardProps {
  channel: lnrpc.IChannel;
  alias?: string;
}
export function ChannelCard({ channel, alias }: IChannelCardProps) {
  const t = useTranslation(namespaces.lightningInfo.lightningInfo).t;
  const closeChannel = useStoreActions((store) => store.channel.closeChannel);
  const getChannels = useStoreActions((store) => store.channel.getChannels);
  const autopilotEnabled = useStoreState((store) => store.settings.autopilotEnabled);
  const changeAutopilotEnabled = useStoreActions((store) => store.settings.changeAutopilotEnabled);
  const setupAutopilot = useStoreActions((store) => store.lightning.setupAutopilot);
  const bitcoinUnit = useStoreState((store) => store.settings.bitcoinUnit);
  const fiatUnit = useStoreState((store) => store.settings.fiatUnit);
  const currentRate = useStoreState((store) => store.fiat.currentRate);
  const preferFiat = useStoreState((store) => store.settings.preferFiat);
  const onchainExplorer = useStoreState((store) => store.settings.onchainExplorer);
  const [deliveryAddress, setDeliveryAddress] = useState<string | undefined>();

  const closeWithAddress = async () => {
    Alert.prompt(
      t("channel.enterDeliveryAddress"),
      "Enter the external Bitcoin address where you want your funds to be deposited.",
      [
        {
          style: "cancel",
          text: "No",
        },
        {
          style: "default",
          text: "Ok",
          onPress: (address) => {
            if (!address || address.trim().length === 0) {
              toast(t("channel.invalidAddress"), undefined, "danger");
              return;
            }
            close(false, address);
          },
        },
      ],
      "plain-text",
      "",
    );
  };

  const close = (force: boolean = false, address: string | undefined) => {
    Alert.alert(
      t("channel.closeChannelPrompt.title"),
      `Are you sure you want to${force ? " force" : ""} close the channel${
        alias ? ` with ${alias}` : ""
      }?`,
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
              const result = await closeChannel({
                fundingTx: channel.channelPoint!.split(":")[0],
                outputIndex: Number.parseInt(channel.channelPoint!.split(":")[1], 10),
                force,
                deliveryAddress: address,
              });
              console.log(result);

              setTimeout(async () => {
                await getChannels(undefined);
              }, 3000);

              if (autopilotEnabled) {
                Alert.alert(
                  "Autopilot",
                  "Automatic channel opening is enabled, " +
                    "new on-chain funds will automatically go to a new channel unless you disable it.\n\n" +
                    "Do you wish to disable automatic channel opening?",
                  [
                    { text: "No" },
                    {
                      text: "Yes",
                      onPress: async () => {
                        changeAutopilotEnabled(false);
                        setupAutopilot(false);
                      },
                    },
                  ],
                );
              }
            } catch (error: any) {
              toast(
                t("msg.error", { ns: namespaces.common }) + ": " + error.message,
                0,
                "danger",
                "OK",
              );
            }
          },
        },
      ],
    );
  };

  const onPressViewInExplorer = async () => {
    const txId = channel.channelPoint?.split(":")[0];
    await Linking.openURL(constructOnchainExplorerUrl(onchainExplorer, txId ?? ""));
  };

  const onAliasLongPress = async () => {
    toast(lnrpc.CommitmentType[channel.commitmentType!]);
  };

  let localBalance = channel.localBalance || Long.fromValue(0);
  if (localBalance.lessThanOrEqual(channel.localChanReserveSat!)) {
    localBalance = Long.fromValue(0);
  } else {
    localBalance = localBalance.sub(channel.localChanReserveSat!);
  }
  let remoteBalance = channel.remoteBalance || Long.fromValue(0);
  if (remoteBalance.lessThanOrEqual(channel.remoteChanReserveSat || Long.fromValue(0))) {
    remoteBalance = Long.fromValue(0);
  } else {
    remoteBalance = remoteBalance.sub(channel.remoteChanReserveSat || Long.fromValue(0));
  }
  const percentageLocal = localBalance.mul(100).div(channel.capacity!).toNumber() / 100;
  const percentageRemote = remoteBalance.mul(100).div(channel.capacity!).toNumber() / 100;
  const percentageReverse = 1 - (percentageLocal + percentageRemote);

  const localReserve = Long.fromValue(
    Math.min(
      channel.localBalance?.toNumber?.() ?? 0,
      channel.localChanReserveSat?.toNumber?.() ?? 0,
    ),
  );

  const serviceKey = identifyService(channel.remotePubkey ?? "", "", null);
  let service;
  if (serviceKey && lightningServices[serviceKey]) {
    service = lightningServices[serviceKey];
  }

  return (
    <Card style={style.channelCard}>
      <CardItem style={style.channelDetail}>
        <View style={style.menuIconContainer}>
          <Menu>
            <MenuTrigger>
              <Icon type="Entypo" name="dots-three-horizontal" />
            </MenuTrigger>
            <MenuOptions customStyles={menuOptionsStyles}>
              <MenuOption
                onSelect={onPressViewInExplorer}
                text={t("generic.viewInBlockExplorer", { ns: namespaces.common })}
              />
              <MenuOption
                onSelect={() => close(false, undefined)}
                text={t("channel.closeChannel")}
              />
              <MenuOption
                onSelect={() => close(true, undefined)}
                text={t("channel.forceCloseChannel")}
              />
              <MenuOption
                onSelect={() => closeWithAddress()}
                text={t("channel.closeChannelToAddress")}
              />
            </MenuOptions>
          </Menu>
        </View>
        <Body>
          <Row
            style={{
              width: "100%",
              marginBottom: PLATFORM === "ios" || PLATFORM === "macos" ? 10 : 0,
            }}
          >
            <Right>
              <Menu>
                <MenuTrigger>
                  <Icon type="Entypo" name="dots-three-horizontal" style={{}} />
                </MenuTrigger>
                <MenuOptions customStyles={menuOptionsStyles}>
                  <MenuOption
                    onSelect={onPressViewInExplorer}
                    text={t("generic.viewInBlockExplorer", { ns: namespaces.common })}
                  />
                  <MenuOption
                    onSelect={() => close(false, undefined)}
                    text={t("channel.closeChannel")}
                  />
                  <MenuOption
                    onSelect={() => close(true, undefined)}
                    text={t("channel.forceCloseChannel")}
                  />
                  <MenuOption
                    onSelect={() => closeWithAddress()}
                    text={t("channel.closeChannelToAddress")}
                  />
                </MenuOptions>
              </Menu>
            </Right>
          </Row>
          {alias && (
            <Row style={{ width: "100%", marginTop: 35 }}>
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
                <CopyText style={style.channelDetailValue} onLongPress={onAliasLongPress}>
                  {alias}
                </CopyText>
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
            <Left style={{ alignSelf: "flex-start" }}>
              <Text style={style.channelDetailTitle}>{t("channel.node")}</Text>
            </Left>
            <Right>
              <CopyText style={{ fontSize: 9.5, textAlign: "right" }}>
                {channel.remotePubkey}
              </CopyText>
            </Right>
          </Row>
          <Row style={{ width: "100%" }}>
            <Left style={{ alignSelf: "flex-start" }}>
              <Text style={style.channelDetailTitle}>{t("channel.channelId")}</Text>
            </Left>
            <Right>
              <CopyText style={{ fontSize: 14 }}>{channel.chanId?.toString()}</CopyText>
            </Right>
          </Row>
          <Row style={{ width: "100%" }}>
            <Left style={{ alignSelf: "flex-start" }}>
              <Text style={style.channelDetailTitle}>{t("channel.channelPoint")}</Text>
            </Left>
            <Right>
              <CopyText style={{ fontSize: 9.5 }}>{channel.channelPoint?.toString()}</CopyText>
            </Right>
          </Row>
          <Row style={{ width: "100%" }}>
            <Left style={{ alignSelf: "flex-start" }}>
              <Text style={style.channelDetailTitle}>{t("channel.status")}</Text>
            </Left>
            <Right>
              {channel.active ? (
                <Text style={{ ...style.channelDetailValue, color: "green" }}>
                  {t("channel.statusActive")}
                </Text>
              ) : (
                <Text style={{ ...style.channelDetailValue, color: "red" }}>
                  {t("channel.statusInactive")}
                </Text>
              )}
            </Right>
          </Row>
          <Row style={{ width: "100%" }}>
            <Left style={{ alignSelf: "flex-start" }}>
              <Text>{t("channel.capacity")}</Text>
            </Left>
            <Right>
              {!preferFiat && (
                <Text>
                  {valueBitcoin(channel.capacity ?? Long.fromValue(0), bitcoinUnit)}{" "}
                  {getUnitNice(new BigNumber(localBalance.toNumber()), bitcoinUnit)}
                </Text>
              )}
              {preferFiat && (
                <Text>
                  {valueFiat(channel.capacity ?? Long.fromValue(0), currentRate).toFixed(2)}{" "}
                  {fiatUnit}
                </Text>
              )}
              <Svg width="100" height="22" style={{ marginBottom: 4, marginTop: -1 }}>
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
                  x2={100 * percentageLocal + 100 * percentageRemote}
                  y2="15"
                  stroke={blixtTheme.red}
                  strokeWidth="8"
                />
                <Line
                  x1={100 * percentageLocal + 100 * percentageRemote}
                  y1="15"
                  x2={100 * percentageLocal + 100 * percentageRemote + 100 * percentageReverse}
                  y2="15"
                  stroke={blixtTheme.lightGray}
                  strokeWidth="8"
                />
              </Svg>
            </Right>
          </Row>
          <Row style={{ width: "100%" }}>
            <Left style={{ alignSelf: "flex-start" }}>
              <Text>{t("channel.howMuchCanBeSent")}</Text>
            </Left>
            <Right>
              <Text>
                {!preferFiat && (
                  <>
                    <Text style={{ color: blixtTheme.green }}>
                      {valueBitcoin(localBalance, bitcoinUnit)}{" "}
                    </Text>
                    <Text>{getUnitNice(new BigNumber(localBalance.toNumber()), bitcoinUnit)}</Text>
                  </>
                )}
                {preferFiat && (
                  <>
                    <Text style={{ color: blixtTheme.green }}>
                      {valueFiat(localBalance, currentRate).toFixed(2)}{" "}
                    </Text>
                    <Text>{fiatUnit}</Text>
                  </>
                )}
              </Text>
            </Right>
          </Row>
          <Row style={{ width: "100%" }}>
            <Left style={{ alignSelf: "flex-start" }}>
              <Text>{t("channel.howMuchCanBeReceived")}</Text>
            </Left>
            <Right>
              <Text style={{ textAlign: "right" }}>
                {!preferFiat && (
                  <>
                    <Text style={{ color: blixtTheme.red }}>
                      {valueBitcoin(remoteBalance, bitcoinUnit)}{" "}
                    </Text>
                    <Text>{getUnitNice(new BigNumber(remoteBalance.toNumber()), bitcoinUnit)}</Text>
                  </>
                )}
                {preferFiat && (
                  <>
                    <Text style={{ color: blixtTheme.red }}>
                      {valueFiat(remoteBalance, currentRate).toFixed(2)}{" "}
                    </Text>
                    <Text>{fiatUnit}</Text>
                  </>
                )}
              </Text>
            </Right>
          </Row>
          <Row style={{ width: "100%" }}>
            <Left style={{ alignSelf: "flex-start" }}>
              <Text>{t("channel.localReserve")}</Text>
            </Left>
            <Right>
              <Text>
                {!preferFiat && (
                  <>
                    <Text>
                      {localReserve.eq(channel.localChanReserveSat!) && (
                        <>{valueBitcoin(localReserve, bitcoinUnit)} </>
                      )}
                      {localReserve.neq(channel.localChanReserveSat!) && (
                        <>
                          {valueBitcoin(localReserve, bitcoinUnit)}/
                          {valueBitcoin(channel.localChanReserveSat!, bitcoinUnit)}{" "}
                        </>
                      )}
                    </Text>
                    <Text>{getUnitNice(new BigNumber(localReserve.toNumber()), bitcoinUnit)}</Text>
                  </>
                )}
                {preferFiat && (
                  <>
                    <Text>
                      {localReserve.eq(channel.localChanReserveSat!) && (
                        <>{valueFiat(localReserve, currentRate).toFixed(2)} </>
                      )}
                      {localReserve.neq(channel.localChanReserveSat!) && (
                        <>
                          {valueFiat(localReserve, currentRate).toFixed(2)}/
                          {valueFiat(channel.localChanReserveSat!, currentRate).toFixed(2)}{" "}
                        </>
                      )}
                    </Text>
                    <Text>{fiatUnit}</Text>
                  </>
                )}
              </Text>
            </Right>
          </Row>
          <Row style={{ width: "100%" }}>
            <Left style={{ alignSelf: "flex-start" }}>
              <Text style={style.channelDetailTitle}>{t("channel.commitmentFee")}</Text>
            </Left>
            <Right>
              <Text>
                {preferFiat &&
                  valueFiat(channel.commitFee ?? Long.fromValue(0), currentRate).toFixed(2) +
                    " " +
                    fiatUnit}
                {!preferFiat &&
                  valueBitcoin(channel.commitFee ?? Long.fromValue(0), bitcoinUnit) +
                    " " +
                    getUnitNice(new BigNumber(localReserve.toNumber()), bitcoinUnit)}
              </Text>
            </Right>
          </Row>
          {(channel.pendingHtlcs?.length ?? 0) > 0 && (
            <Row style={{ width: "100%" }}>
              <Left style={{ alignSelf: "flex-start" }}>
                <Text style={style.channelDetailTitle}>Pending HTLCs</Text>
              </Left>
              <Right>
                <Text>{channel.pendingHtlcs?.length.toString()}</Text>
              </Right>
            </Row>
          )}
          <Row style={{ width: "100%" }}>
            <Left style={{ alignSelf: "flex-start" }}>
              <Text style={style.channelDetailTitle}>{t("channel.channelType")}</Text>
            </Left>
            <Right>
              <Text>{lnrpc.CommitmentType[channel.commitmentType!]}</Text>
            </Right>
          </Row>
          <Row style={{ width: "100%" }}>
            <Left style={{ alignSelf: "flex-start" }}>
              <Text style={style.channelDetailTitle}>{t("channel.forceCloseDelay")}</Text>
            </Left>
            <Right>
              <Text>
                {t("generic.blocks", { ns: namespaces.common, numBlocks: channel.csvDelay })}
              </Text>
            </Right>
          </Row>
          {!channel.private && (
            <Row style={{ width: "100%" }}>
              <Right>
                <Text style={{ color: "orange" }}>Public channel</Text>
              </Right>
            </Row>
          )}
          {channel.zeroConf && !channel.zeroConfConfirmedScid && (
            <Row style={{ width: "100%" }}>
              <Right>
                <Text style={{ color: "orange" }}>0conf channel</Text>
              </Right>
            </Row>
          )}
          {channel.aliasScids?.length! > 0 && (
            <Row style={{ width: "100%" }}>
              <Right>
                <Text style={{ color: "orange" }}>Alias scid</Text>
              </Right>
            </Row>
          )}
        </Body>
      </CardItem>
    </Card>
  );
}

export default ChannelCard;

const menuOptionsStyles = {
  optionsContainer: {
    padding: 5,
    borderRadius: 5,
    shadowColor: blixtTheme.dark,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    backgroundColor: blixtTheme.light,
  },
  optionWrapper: {
    padding: 5,
  },
  optionText: {
    fontSize: 16,
    color: blixtTheme.dark,
  },
};

export const style = StyleSheet.create({
  channelCard: {
    width: "100%",
    marginTop: 8,
    paddingBottom: 16,
  },
  channelDetail: {
    paddingTop: 8, // Add padding to the top of the detail section
  },
  channelDetails: {
    fontSize: 16,
  },
  channelDetailTitle: {},
  channelDetailValue: {},
  channelDetailAmount: {
    fontSize: 15,
  },
  nodeImage: {
    borderRadius: 22,
    marginLeft: 10,
    marginTop: -2.5,
    marginBottom: 4,
  },
  menuIconContainer: {},
  menuIcon: {
    fontSize: 35,
    color: blixtTheme.light,
  },
});

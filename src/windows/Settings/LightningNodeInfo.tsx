import React, { useEffect } from "react";
import { StyleSheet, ScrollView, Platform } from "react-native";
import Clipboard from "@react-native-community/clipboard";
import { Body, Card, Text, CardItem, H1 } from "native-base";
import { fromUnixTime } from "date-fns";

import Blurmodal from "../../components/BlurModal";
import { formatISO, toast } from "../../utils";
import { useStoreState, useStoreActions } from "../../state/store";

import { useTranslation } from "react-i18next";
import { namespaces } from "../../i18n/i18n.constants";

interface IMetaDataProps {
  title: string;
  data: string | string[];
}
const MetaData = ({ title, data }: IMetaDataProps) => {
  const { t } = useTranslation(namespaces.settings.lightningNodeInfo);

  return (
    <Text
      style={style.detailText}
      onPress={() => {
        Array.isArray(data)
          ? Clipboard.setString(data.join("\n"))
          : Clipboard.setString(data);
        toast(t("msg.clipboardCopy",{ns:namespaces.common}), undefined, "warning");
      }}
    >
      <Text style={{ fontWeight: "bold" }}>{title}:{"\n"}</Text>
      {Array.isArray(data) && data.join("\n")}
      {!Array.isArray(data) && data}
    </Text>
  );
};

export default function LightningNodeInfo() {
  const { t } = useTranslation(namespaces.settings.lightningNodeInfo);
  const nodeInfo = useStoreState((store) => store.lightning.nodeInfo);
  const getNodeInfo = useStoreActions((store) => store.lightning.getInfo);

  useEffect(() => {
    (async () => {
      await getNodeInfo();
    })();
  }, [getNodeInfo]);

  if (!nodeInfo) {
    return (<></>);
  }

  return (
    <Blurmodal>
      <Card style={style.card}>
        <CardItem>
          <Body>
            <ScrollView>
              <H1 style={style.header}>{t("title")}</H1>
              <MetaData title={t("alias")} data={nodeInfo.alias!} />
              <MetaData title={t("chain")} data={nodeInfo.chains!.map(({chain, network}, key) => `${chain} (${network})`).join("\n")} />
              <MetaData title={t("timestamp")} data={formatISO(fromUnixTime(nodeInfo.bestHeaderTimestamp!.toNumber()))} />
              <MetaData title={t("blockHash")} data={nodeInfo.blockHash!} />
              <MetaData title={t("blockHeight")} data={nodeInfo.blockHeight!.toString()} />
              <MetaData title={t("identityPubkey")} data={nodeInfo.identityPubkey!} />
              <MetaData title={t("channel.title")} data={[
                `${t("channel.active")}: ${nodeInfo.numActiveChannels!.toString()}`,
                `${t("channel.inactive")}: ${nodeInfo.numInactiveChannels!.toString()}`,
                `${t("channel.pending")}: ${nodeInfo.numPendingChannels!.toString()}`,
              ]} />
              <MetaData title={t("numPeers")} data={nodeInfo.numPeers!.toString()} />
              <MetaData title={t("syncedToChain")} data={nodeInfo.syncedToChain!.toString()} />
              <MetaData title={t("syncedToGraph")} data={nodeInfo.syncedToGraph!.toString()} />
              {nodeInfo.uris && nodeInfo.uris.length > 0 && <MetaData title={t("nodeUris")} data={nodeInfo.uris.join("\n")} />}
              <MetaData title={t("version")} data={nodeInfo.version!} />
              <MetaData title={t("features")} data={Object.values(nodeInfo.features!).map((feature) => feature.name).join(", ")} />
            </ScrollView>
          </Body>
        </CardItem>
      </Card>
    </Blurmodal>
  );
};

const style = StyleSheet.create({
  card: {
    padding: 5,
    width: "100%",
    minHeight: "55%",
    maxHeight: "86%",
  },
  header: {
    width: "100%",
    fontWeight: "bold",
    marginBottom: 8,
  },
  detailText: {
    marginBottom: 7,
    ...Platform.select({
      web: {
        wordBreak: "break-all"
      },
    }),
  },
});


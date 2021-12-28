import React, { useEffect } from "react";
import { StyleSheet, ScrollView, Platform } from "react-native";
import Clipboard from "@react-native-community/clipboard";
import { Body, Card, Text, CardItem, H1 } from "native-base";
import { fromUnixTime } from "date-fns";

import Blurmodal from "../../components/BlurModal";
import { formatISO, toast } from "../../utils";
import { useStoreState, useStoreActions } from "../../state/store";

interface IMetaDataProps {
  title: string;
  data: string | string[];
}
const MetaData = ({ title, data }: IMetaDataProps) => {
  return (
    <Text
      style={style.detailText}
      onPress={() => {
        Array.isArray(data)
          ? Clipboard.setString(data.join("\n"))
          : Clipboard.setString(data);
        toast("Copied to clipboard", undefined, "warning");
      }}
    >
      <Text style={{ fontWeight: "bold" }}>{title}:{"\n"}</Text>
      {Array.isArray(data) && data.join("\n")}
      {!Array.isArray(data) && data}
    </Text>
  );
};

export default function LightningNodeInfo() {
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
              <H1 style={style.header}>Node Info</H1>
              <MetaData title="Node Alias" data={nodeInfo.alias!} />
              <MetaData title="Chain" data={nodeInfo.chains!.map(({chain, network}, key) => `${chain} (${network})`).join("\n")} />
              <MetaData title="Best Header Timestamp" data={formatISO(fromUnixTime(nodeInfo.bestHeaderTimestamp!.toNumber()))} />
              <MetaData title="Block Hash" data={nodeInfo.blockHash!} />
              <MetaData title="Block Height" data={nodeInfo.blockHeight!.toString()} />
              <MetaData title="Identity Pubkey" data={nodeInfo.identityPubkey!} />
              <MetaData title="Num Channels" data={[
                `Active: ${nodeInfo.numActiveChannels!.toString()}`,
                `Inactive: ${nodeInfo.numInactiveChannels!.toString()}`,
                `Pending: ${nodeInfo.numPendingChannels!.toString()}`,
              ]} />
              <MetaData title="Num peers" data={nodeInfo.numPeers!.toString()} />
              <MetaData title="Synced to Chain" data={nodeInfo.syncedToChain!.toString()} />
              <MetaData title="Synced to Graph" data={nodeInfo.syncedToGraph!.toString()} />
              {nodeInfo.uris && nodeInfo.uris.length > 0 && <MetaData title="Node URIs" data={nodeInfo.uris.join("\n")} />}
              <MetaData title="Lnd Version" data={nodeInfo.version!} />
              <MetaData title="Node features" data={Object.values(nodeInfo.features!).map((feature) => feature.name).join(", ")} />
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


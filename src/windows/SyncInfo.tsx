import React from "react";
import { StyleSheet } from "react-native";
import Clipboard from "@react-native-community/react-native-clipboard";
import { Body, Card, Text, CardItem, H1, Toast, View, Button } from "native-base";
import { useStoreState } from "../state/store";

import Blurmodal from "../components/BlurModal";
import TextLink from "../components/TextLink";

interface IMetaDataProps {
  title: string;
  data: string;
  url?: string;
}
const MetaData = ({ title, data, url }: IMetaDataProps) => {
  return (
    <Text
      style={style.detailText}
      onPress={() => {
        Clipboard.setString(data);
        Toast.show({ text: "Copied to clipboard.", type: "warning" });
      }}
    >
      <Text style={{ fontWeight: "bold" }}>{title}:{"\n"}</Text>
      {!url && data}
      {url && <TextLink url={url}>{data}</TextLink>}
    </Text>
  );
};

export interface ISyncInfoProps {
  navigation: any;
}
export default function SyncInfo({ route }: any) {
  const nodeInfo = useStoreState((store) => store.lightning.nodeInfo);

  return (
    <Blurmodal>
      <Card style={style.card}>
        <CardItem>
          <Body>
            <H1 style={style.header}>
              {!nodeInfo?.syncedToChain ? "Syncing in progress" : "Syncing complete"}
            </H1>
            <Text style={{ marginBottom: 14 }}>
              {!nodeInfo?.syncedToChain
                ?
                  "Blixt Wallet is currently syncing the blockchain.\n\n" +
                  "Once your wallet is in sync with the blockchain, on-chain transactions and funds will be recognized and can be seen from the Bitcoin on-chain section."
                :
                  "Blixt Wallet is in sync with the blockchain."
              }
            </Text>
            <MetaData title="Current block height" data={nodeInfo?.blockHeight?.toString() ?? "N/A"} />
            <MetaData title="Synced to chain" data={nodeInfo?.syncedToChain ? "Yes" : "No"} />
            <MetaData title="Synced to lightning graph" data={nodeInfo?.syncedToGraph ? "Yes" : "No"} />
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
    minHeight: "45%",
  },
  header: {
    fontWeight: "bold",
    marginBottom: 10,
  },
  detailText: {
    marginBottom: 7,
  },
  qrText: {
    marginBottom: 7,
    paddingTop: 4,
    paddingLeft: 18,
    paddingRight: 18,
  }
});

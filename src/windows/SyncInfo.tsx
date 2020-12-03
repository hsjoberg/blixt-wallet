import React from "react";
import { StyleSheet } from "react-native";
import { Body, Card, Text, CardItem, H1 } from "native-base";
import Clipboard from "@react-native-community/clipboard";
import { Bar } from "react-native-progress";

import { useStoreState } from "../state/store";
import Blurmodal from "../components/BlurModal";
import TextLink from "../components/TextLink";
import { blixtTheme } from "../../native-base-theme/variables/commonColor";
import { toast } from "../utils";

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
        toast("Copied to clipboard.", undefined, "warning");
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
  const initialKnownBlockheight = useStoreState((store) => store.lightning.initialKnownBlockheight);
  const bestBlockheight = useStoreState((store) => store.lightning.bestBlockheight);

  const currentProgress = (nodeInfo?.blockHeight ?? 0) - (initialKnownBlockheight ?? 0);
  const numBlocksUntilSynced = (bestBlockheight ?? 0) - (initialKnownBlockheight ?? 0);
  let progress = currentProgress / numBlocksUntilSynced;
  if (Number.isNaN(progress)) {
    progress = 1;
  }

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
            {nodeInfo?.syncedToChain === false && bestBlockheight !== undefined &&
              <>
                <Text style={[style.detailText, { fontWeight: "bold" }]}>Progress:</Text>
                <Bar
                  width={200}
                  style={{ marginTop: 3, marginLeft: 1 }}
                  color={blixtTheme.primary}
                  progress={progress}
                />
              </>
            }
            {nodeInfo?.syncedToChain === true &&
              <MetaData title="Progress" data="Syncing complete" />
            }
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
    minHeight: "40%",
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

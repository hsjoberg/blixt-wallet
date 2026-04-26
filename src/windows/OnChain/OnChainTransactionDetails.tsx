import React from "react";
import { StyleSheet, Linking, View } from "react-native";
import Clipboard from "@react-native-clipboard/clipboard";
import { Body, Card, Text, CardItem, H1 } from "native-base";
import { Button } from "../../components/Button";
import { fromUnixTime } from "date-fns";
import { RouteProp } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";

import { OnChainStackParamList } from "./index";
import Blurmodal from "../../components/BlurModal";
import { formatISO, toast } from "../../utils";
import { useStoreState } from "../../state/store";
import { formatBitcoin } from "../../utils/bitcoin-units";
import { constructOnchainExplorerUrl } from "../../utils/onchain-explorer";

import { useTranslation } from "react-i18next";
import { namespaces } from "../../i18n/i18n.constants";

interface IMetaDataProps {
  title: string;
  data: string;
}
const MetaData = ({ title, data }: IMetaDataProps) => {
  const t = useTranslation(namespaces.onchain.onChainTransactionDetails).t;

  return (
    <Text
      style={style.detailText}
      onPress={() => {
        Clipboard.setString(data);
        toast(t("msg.clipboardCopy", { ns: namespaces.common }), undefined, "warning");
      }}
    >
      <Text style={{ fontWeight: "bold" }}>
        {title}:{"\n"}
      </Text>
      {data}
    </Text>
  );
};

export interface ITransactionDetailsProps {
  navigation: StackNavigationProp<OnChainStackParamList, "OnChainTransactionDetails">;
  route: RouteProp<OnChainStackParamList, "OnChainTransactionDetails">;
}
export default function OnChainTransactionDetails({ navigation, route }: ITransactionDetailsProps) {
  const t = useTranslation(namespaces.onchain.onChainTransactionDetails).t;
  const txId: string = route.params.txId;
  const transaction = useStoreState((store) => store.onChain.getOnChainTransactionByTxId(txId));
  const bitcoinUnit = useStoreState((store) => store.settings.bitcoinUnit);
  const onchainExplorer = useStoreState((store) => store.settings.onchainExplorer);

  if (!transaction) {
    return <></>;
  }

  const onPressBlockExplorer = async () => {
    await Linking.openURL(constructOnchainExplorerUrl(onchainExplorer, txId));
  };

  return (
    <Blurmodal>
      <Card style={style.card}>
        <CardItem>
          <Body>
            <View
              style={{
                display: "flex",
                flexDirection: "row",
                justifyContent: "space-between",
                width: "100%",
              }}
            >
              <H1 style={style.header}>{t("title")}</H1>
              <Button small={true} onPress={onPressBlockExplorer}>
                <Text style={{ fontSize: 9 }}>
                  {t("generic.viewInBlockExplorer", { ns: namespaces.common })}
                </Text>
              </Button>
            </View>
            <MetaData title={t("txHash")} data={transaction.txHash!} />
            <MetaData
              title={t("timeStamp")}
              data={formatISO(fromUnixTime(Number(transaction.timeStamp)))}
            />
            {transaction.amount && (
              <MetaData title={t("amount")} data={formatBitcoin(transaction.amount, bitcoinUnit)} />
            )}
            {transaction.totalFees && (
              <MetaData
                title={t("totalFees")}
                data={transaction.totalFees.toString() + " Satoshi"}
              />
            )}
            {transaction.label && <MetaData title={t("label")} data={transaction.label} />}
            <MetaData title={t("destAddresses")} data={transaction.destAddresses![0]} />
            <MetaData
              title={t("numConfirmations")}
              data={transaction.numConfirmations?.toString() ?? "Unknown"}
            />
            <MetaData
              title={t("blockHeight")}
              data={transaction.blockHeight?.toString() ?? "Unknown"}
            />
            <MetaData
              title={t("blockHash")}
              data={transaction.blockHash?.toString() ?? "Unknown"}
            />
            <Text
              style={style.detailText}
              onPress={() => {
                Clipboard.setString(transaction.rawTxHex?.toString() ?? "Unknown");
                toast(t("msg.clipboardCopy", { ns: namespaces.common }), undefined, "warning");
              }}
            >
              <Text style={{ fontWeight: "bold" }}>
                {t("rawTxHex.title")}:{"\n"}
              </Text>
              {t("rawTxHex.msg")}
            </Text>
          </Body>
        </CardItem>
      </Card>
    </Blurmodal>
  );
}

const style = StyleSheet.create({
  card: {
    padding: 5,
    width: "100%",
    minHeight: "55%",
  },
  header: {
    fontWeight: "bold",
    marginBottom: 8,
  },
  detailText: {
    marginBottom: 7,
  },
});

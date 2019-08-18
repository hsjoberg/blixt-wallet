import React from "react";
import { StyleSheet, Clipboard } from "react-native";
import { Body, Card, Text, CardItem, H1, Toast } from "native-base";
import { NavigationScreenProp } from "react-navigation";
import { fromUnixTime } from "date-fns";

import Blurmodal from "../../components/BlurModal";
import { formatISO } from "../../utils";
import { useStoreState } from "../../state/store";
import { formatBitcoin } from "../../utils/bitcoin-units";

interface IMetaDataProps {
  title: string;
  data: string;
}
const MetaData = ({ title, data }: IMetaDataProps) => {
  return (
    <Text
      style={style.detailText}
      onPress={() => {
        Clipboard.setString(data);
        Toast.show({ text: "Copied to clipboard.", type: "warning" });
      }}
    >
      <Text style={{ fontWeight: "bold" }}>{title}:{"\n"}</Text>
      {data}
    </Text>
  );
};

export interface ITransactionDetailsProps {
  navigation: NavigationScreenProp<{}>;
}
export default ({ navigation }: ITransactionDetailsProps) => {
  const txId: string = navigation.getParam("txId");
  const transaction = useStoreState((store) => store.onChain.getOnChainTransactionByTxId(txId));
  const bitcoinUnit = useStoreState((store) => store.settings.bitcoinUnit);

  if (!transaction) {
    return (<></>);
  }

  return (
    <Blurmodal navigation={navigation}>
      <Card style={style.card}>
        <CardItem>
          <Body>
            <H1 style={style.header}>Transaction</H1>
            <MetaData title="Id" data={transaction.txHash!} />
            <MetaData title="Date" data={formatISO(fromUnixTime(transaction.timeStamp!.toNumber()))} />
            {transaction.amount && <MetaData title="Amount" data={formatBitcoin(transaction.amount, bitcoinUnit)} />}
            {transaction.totalFees && <MetaData title="Fees" data={transaction.totalFees.toString() + " Satoshi"} />}
            <MetaData title="Destination" data={transaction.destAddresses![transaction!.destAddresses!.length - 1]} />
            <MetaData title="Confirmations" data={(transaction.numConfirmations && transaction.numConfirmations.toString()) || "Unknown"} />
            <MetaData title="Block height" data={(transaction.blockHeight && transaction.blockHeight!.toString()) || "Unknown"} />
            <MetaData title="Block hash" data={(transaction.blockHash && transaction.blockHash.toString()) || "Unknown"} />
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
  },
  header: {
    width: "100%",
    fontWeight: "bold",
    marginBottom: 8,
  },
  detailText: {
    marginBottom: 7,
  },
});

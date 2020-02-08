import React from "react";
import { StyleSheet, Share } from "react-native";
import Clipboard from "@react-native-community/react-native-clipboard";
import { Body, Card, Text, CardItem, H1, Toast, View } from "native-base";
import { fromUnixTime } from "date-fns";

import Blurmodal from "../components/BlurModal";
import QrCode from "../components/QrCode";
import { capitalize, formatISO, isLong } from "../utils";
import { formatBitcoin } from "../utils/bitcoin-units"
import { useStoreState } from "../state/store";
import { extractDescription } from "../utils/NameDesc";
import { smallScreen } from "../utils/device";
import CopyAddress from "../components/CopyAddress";

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
  navigation: any;
}
export default ({ route }: any) => {
  const rHash: string = route.params.rHash;
  const transaction = useStoreState((store) => store.transaction.getTransactionByRHash(rHash));
  const bitcoinUnit = useStoreState((store) => store.settings.bitcoinUnit);

  if (!transaction) {
    console.log("no trans");
    return (<></>);
  }

  const { name, description } = extractDescription(transaction.description);

  const onQrPress = async () => {
    await Share.share({
      message: "lightning:" + transaction.paymentRequest,
    });
  };

  const onPaymentRequestTextPress = () => {
    Clipboard.setString(transaction.paymentRequest);
    Toast.show({ text: "Copied to clipboard.", type: "warning" });
  };

  let transactionValue: Long;
  let direction: "send" | "receive";
  if (isLong(transaction.amtPaidSat) && transaction.amtPaidSat.greaterThanOrEqual(0)) {
    direction = "receive";
    transactionValue = transaction.amtPaidSat;
  }
  else {
    direction = "send";
    transactionValue = transaction.value;
  }

  return (
    <Blurmodal>
      <Card style={style.card}>
        <CardItem>
          <Body>
            <H1 style={style.header}>Transaction</H1>
            <MetaData title="Date" data={formatISO(fromUnixTime(transaction.date.toNumber()))} />
            {(transaction.nodeAliasCached && name == undefined) && <MetaData title="Node alias" data={transaction.nodeAliasCached} />}
            {direction === "receive" && !transaction.tlvRecordName && transaction.payer && <MetaData title="Payer" data={transaction.payer} />}
            {direction === "receive" && transaction.tlvRecordName && <MetaData title="Payer" data={transaction.tlvRecordName} />}
            {(direction === "send" && name) && <MetaData title="Recipient" data={name} />}
            <MetaData title="Description" data={description} />
            <MetaData title="Amount" data={formatBitcoin(transactionValue, bitcoinUnit)} />
            {transaction.valueFiat != null && transaction.valueFiatCurrency && <MetaData title="Amount in Fiat (Time of Payment)" data={`${transaction.valueFiat.toFixed(2)} ${transaction.valueFiatCurrency}`} />}
            {transaction.fee !== null && transaction.fee !== undefined && <MetaData title="Fee" data={transaction.fee.toString() + " Satoshi"} />}
            {transaction.hops && transaction.hops.length > 0 && <MetaData title="Number of hops" data={transaction.hops.length.toString()} />}
            {direction === "send" && <MetaData title="Remote pubkey" data={transaction.remotePubkey}/>}
            <MetaData title="Status" data={capitalize(transaction.status)} />
            {transaction.status === "OPEN" &&
              <View style={{ alignItems: "center" }}>
                <QrCode size={smallScreen ? 220 : 280} data={transaction.paymentRequest.toUpperCase()} onPress={onQrPress} border={25} />
                <CopyAddress text={transaction.paymentRequest} onPress={onPaymentRequestTextPress} />
              </View>
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
  qrText: {
    marginBottom: 7,
    paddingTop: 4,
    paddingLeft: 18,
    paddingRight: 18,
  }
});

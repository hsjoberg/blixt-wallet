import React from "react";
import { StyleSheet, Clipboard } from "react-native";
import { Body, Card, Text, CardItem, H1, Toast } from "native-base";
import { NavigationScreenProp } from "react-navigation";
import { fromUnixTime, format } from "date-fns";

import Blurmodal from "../components/BlurModal";
import QrCode from "../components/QrCode";
import { capitalize } from "../utils";
import { useStoreState } from "../state/store";

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
  const rHash: string = navigation.getParam("rHash");
  const transaction = useStoreState((store) => store.transaction.getTransactionByRHash(rHash));

  if (!transaction) {
    return (<></>);
  }

  return (
    <Blurmodal navigation={navigation}>
      <Card style={style.card}>
        <CardItem>
          <Body>
            <H1 style={style.header}>Transaction</H1>
            <MetaData title="Date" data={format(fromUnixTime(transaction.date), "yyyy-MM-dd hh:mm")} />
            {transaction.nodeAliasCached && <MetaData title="Recipient name" data={transaction.nodeAliasCached} />}
            <MetaData title="Description" data={transaction.description} />
            <MetaData title="Amount" data={transaction.value + " Satoshi"} />
            {transaction.fee !== null && transaction.fee !== undefined && <MetaData title="Fee" data={transaction.fee + " Satoshi"} />}
            {transaction.hops && transaction.hops.length > 0 && <MetaData title="Number of hops" data={transaction.hops.length.toString()} />}
            {transaction.value < 0 && <MetaData title="Remote pubkey" data={transaction.remotePubkey}/>}
            <MetaData title="Status" data={capitalize(transaction.status)} />
            {transaction.status !== "SETTLED" &&
              <>
                <QrCode data={transaction.paymentRequest.toUpperCase()} size={280} border={25} />
                <Text
                  style={{ ...style.detailText, paddingTop: 4, paddingLeft: 18, paddingRight: 18 }}
                  onPress={() => {
                    Clipboard.setString(transaction.paymentRequest);
                    Toast.show({ text: "Copied to clipboard.", type: "warning" });
                  }}
                  numberOfLines={1}
                  lineBreakMode="middle"
                  >
                    {transaction.paymentRequest}
                </Text>
              </>
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
});

import React, { useEffect } from "react";
import { StyleSheet, Clipboard } from "react-native";
import { View } from "react-native";
import { Body, Card, Text, CardItem, H1, Toast, Button, Icon } from "native-base";
import { NavigationScreenProp } from "react-navigation";
import * as QRCode from "qrcode";
import SvgUri from "react-native-svg-uri";

import { useStoreState } from "../state/store";
import { blixtTheme } from "../../native-base-theme/variables/commonColor";
import { fromUnixTime, format } from "date-fns";
import Blurmodal from "../components/BlurModal";
import { capitalize } from "../utils";


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
  const transaction = useStoreState((store) => store.transaction.transactions.find((tx) => tx.rHash === rHash));

  const bolt11payReq: string = (QRCode as any).toString(transaction.paymentRequest.toUpperCase())._55;

  return (
    <Blurmodal navigation={navigation}>
      <Card style={style.card}>
        <CardItem>
          <Body>
            <H1 style={style.header}>Transaction</H1>
            <MetaData title="Date" data={format(fromUnixTime(transaction.date), "yyyy-MM-dd hh:mm")} />
            <MetaData title="Description" data={transaction.description} />
            <MetaData title="Amount" data={transaction.value + " Satoshi"} />
            {transaction.fee !== null && transaction.fee !== undefined && <MetaData title="Fee" data={transaction.fee + " Satoshi"} />}
            <MetaData title="Remote pubkey" data={transaction.remotePubkey}/>
            <MetaData title="Status" data={capitalize(transaction.status)} />
            {transaction.status !== "SETTLED" &&
              <>
                <View style={{ alignItems: "center", justifyContent: "center", width: "100%" }}>
                  <SvgUri width={300} height={300} svgXmlData={bolt11payReq} fill={blixtTheme.light} />
                </View>
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

import React, { useState } from "react";
import { StyleSheet, Share } from "react-native";
import Clipboard from "@react-native-community/react-native-clipboard";
import { Body, Card, Text, CardItem, H1, Toast, View, Button } from "native-base";
import { fromUnixTime } from "date-fns";
import MapView, {PROVIDER_GOOGLE, Marker} from "react-native-maps";

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

  const [currentScreen, setCurrentScreen] = useState<"Overview" | "Map">("Overview");

  if (!transaction) {
    console.log("No transaction");
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

  if (currentScreen === "Overview") {
    return (
      <Blurmodal>
        <Card style={style.card}>
          <CardItem>
            <Body>
              <View style={{ display: "flex", flexDirection: "row", justifyContent: "space-between", width: "100%" }}>
                <H1 style={style.header}>
                  Transaction
                </H1>
                {transaction.locationLat && transaction.locationLat &&
                  <Button small={true} onPress={() => setCurrentScreen("Map")}>
                    <Text style={{ fontSize: 9 }}>Show map</Text>
                  </Button>
                }
              </View>
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
  }
  else if (currentScreen === "Map") {
    return (
      <Blurmodal>
        <Card style={style.card}>
          <CardItem>
            <Body>
              <View style={{ display: "flex", flexDirection: "row", justifyContent: "space-between", width: "100%" }}>
                <H1 style={style.header}>
                  Transaction
                </H1>
                <Button small={true} onPress={() => setCurrentScreen("Overview")}>
                  <Text style={{ fontSize: 9 }}>Go back</Text>
                </Button>
              </View>
              <MapView
               provider={PROVIDER_GOOGLE}
                style={{
                  width: "100%",
                  height: 395,
                }}
                initialRegion={{
                  longitude: transaction.locationLong!,
                  latitude: transaction.locationLat!,
                  latitudeDelta: 0.00622,
                  longitudeDelta: 0.00251,
                }}
              >
                <Marker coordinate={{
                  longitude: transaction.locationLong!,
                  latitude: transaction.locationLat!,
                }} />
              </MapView>
            </Body>
          </CardItem>
        </Card>
      </Blurmodal>
    );
  }
};

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
  qrText: {
    marginBottom: 7,
    paddingTop: 4,
    paddingLeft: 18,
    paddingRight: 18,
  }
});

import React, { useState } from "react";
import { StyleSheet, Share } from "react-native";
import Clipboard from "@react-native-community/react-native-clipboard";
import { Body, Card, Text, CardItem, H1, View, Button } from "native-base";
import { fromUnixTime } from "date-fns";
import MapView, { PROVIDER_GOOGLE, Marker } from "react-native-maps";

import Blurmodal from "../components/BlurModal";
import QrCode from "../components/QrCode";
import { capitalize, formatISO, isLong, decryptLNURLPayAesTagMessage, toast, bytesToHexString } from "../utils";
import { formatBitcoin } from "../utils/bitcoin-units"
import { useStoreState } from "../state/store";
import { extractDescription } from "../utils/NameDesc";
import { smallScreen } from "../utils/device";
import CopyAddress from "../components/CopyAddress";
import { MapStyle } from "../utils/google-maps";
import TextLink from "../components/TextLink";
import { ITransaction } from "../storage/database/transaction";

interface IMetaDataProps {
  title: string;
  data: string;
  url?: string;
}
function MetaData({ title, data, url }: IMetaDataProps) {
  return (
    <Text
      style={style.detailText}
      onPress={() => {
        Clipboard.setString(data);
        toast("Copied to clipboard", undefined, "warning");
      }}
    >
      <Text style={{ fontWeight: "bold" }}>{title}:{"\n"}</Text>
      {!url && data}
      {url && <TextLink url={url}>{data}</TextLink>}
    </Text>
  );
};

export interface ITransactionDetailsProps {
  navigation: any;
}
export default function TransactionDetails({ route }: any) {
  const rHash: string = route.params.rHash;
  const transaction = useStoreState((store) => store.transaction.getTransactionByRHash(rHash));
  const bitcoinUnit = useStoreState((store) => store.settings.bitcoinUnit);
  const transactionGeolocationMapStyle = useStoreState((store) => store.settings.transactionGeolocationMapStyle);

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
    toast("Copied to clipboard", undefined, "warning");
  };

  let transactionValue: Long;
  let direction: "send" | "receive";
  if (isLong(transaction.value) && transaction.value.greaterThanOrEqual(0)) {
    direction = "receive";
    transactionValue = transaction.value;
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
              {transaction.website && <MetaData title="Website" data={transaction.website} url={"https://" + transaction.website} />}
              {transaction.type !== "NORMAL" && <MetaData title="Type" data={transaction.type} />}
              {(transaction.type === "LNURL" && transaction.lnurlPayResponse && transaction.lnurlPayResponse.successAction) && <LNURLMetaData transaction={transaction} />}
              {(transaction.nodeAliasCached && name === null) && <MetaData title="Node alias" data={transaction.nodeAliasCached} />}
              {direction === "receive" && !transaction.tlvRecordName && transaction.payer && <MetaData title="Payer" data={transaction.payer} />}
              {direction === "receive" && transaction.tlvRecordName && <MetaData title="Payer" data={transaction.tlvRecordName} />}
              {(direction === "send" && name) && <MetaData title="Recipient" data={name} />}
              {(description !== null && description.length > 0) && <MetaData title="Description" data={description} />}
              <MetaData title="Amount" data={formatBitcoin(transactionValue, bitcoinUnit)} />
              {transaction.valueFiat != null && transaction.valueFiatCurrency && <MetaData title="Amount in Fiat (Time of Payment)" data={`${transaction.valueFiat.toFixed(2)} ${transaction.valueFiatCurrency}`} />}
              {transaction.fee !== null && transaction.fee !== undefined && <MetaData title="Fee" data={transaction.fee.toString() + " Satoshi"} />}
              {transaction.hops && transaction.hops.length > 0 && <MetaData title="Number of hops" data={transaction.hops.length.toString()} />}
              {direction === "send" && <MetaData title="Remote pubkey" data={transaction.remotePubkey} />}
              {transaction.status === "SETTLED" && transaction.preimage && <MetaData title="Preimage" data={bytesToHexString(transaction.preimage)}/>}
              <MetaData title="Status" data={capitalize(transaction.status)} />
              {transaction.status === "OPEN" && transaction.type !== "LNURL" &&
                <>
                  <View style={{ width: "100%", alignItems: "center", justifyContent: "center" }}>
                    <QrCode size={smallScreen ? 220 : 280} data={transaction.paymentRequest.toUpperCase()} onPress={onQrPress} border={25} />
                  </View>
                  <View style={{ alignItems: "center", justifyContent: "center" }}>
                    <CopyAddress text={transaction.paymentRequest} onPress={onPaymentRequestTextPress} />
                  </View>
                </>
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
                  height: 450,
                }}
                initialRegion={{
                  longitude: transaction.locationLong!,
                  latitude: transaction.locationLat!,
                  latitudeDelta: 0.00622,
                  longitudeDelta: 0.00251,
                }}
                customMapStyle={MapStyle[transactionGeolocationMapStyle]}
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


interface IWebLNMetaDataProps {
  transaction: ITransaction;
}
function LNURLMetaData({ transaction }: IWebLNMetaDataProps) {
  let secretMessage: string | null = null;

  if (transaction.lnurlPayResponse?.successAction?.tag === "aes") {
    secretMessage = decryptLNURLPayAesTagMessage(
      transaction.preimage,
      transaction.lnurlPayResponse.successAction.iv,
      transaction.lnurlPayResponse.successAction.ciphertext,
    );
  }

  return (
    <>
      {transaction.lnurlPayResponse?.successAction?.tag === "message" &&
        <MetaData title={`Message from ${transaction.website}`} data={transaction.lnurlPayResponse.successAction.message} />
      }
      {transaction.lnurlPayResponse?.successAction?.tag === "url" &&
        <>
          <MetaData title={`Messsage from ${transaction.website}`} data={transaction.lnurlPayResponse.successAction.description} />
          <MetaData title={`URL received from ${transaction.website}`} data={transaction.lnurlPayResponse.successAction.url} url={transaction.lnurlPayResponse.successAction.url} />
        </>
      }
      {transaction.lnurlPayResponse?.successAction?.tag === "aes" &&
        <>
          <MetaData title={`Messsage from ${transaction.website}`} data={transaction.lnurlPayResponse.successAction.description} />
          <MetaData title="Secret Message" data={secretMessage!} />
        </>
      }
    </>
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
  qrText: {
    marginBottom: 7,
    paddingTop: 4,
    paddingLeft: 18,
    paddingRight: 18,
  }
});

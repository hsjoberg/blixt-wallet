import React, { useState } from "react";
import { StyleSheet, Share, Platform, LayoutAnimation, ScrollView, TouchableOpacity } from "react-native";
import DialogAndroid from "react-native-dialogs";
import Clipboard from "@react-native-community/clipboard";
import { Card, Text, CardItem, H1, View, Button, Icon } from "native-base";
import { fromUnixTime } from "date-fns";
import MapView, { PROVIDER_DEFAULT } from "react-native-maps";

import Blurmodal from "../components/BlurModal";
import QrCode from "../components/QrCode";
import { capitalize, formatISO, isLong, decryptLNURLPayAesTagMessage, toast, bytesToHexString } from "../utils";
import { formatBitcoin } from "../utils/bitcoin-units"
import { useStoreState, useStoreActions } from "../state/store";
import { extractDescription } from "../utils/NameDesc";
import { smallScreen } from "../utils/device";
import CopyAddress from "../components/CopyAddress";
import { MapStyle } from "../utils/google-maps";
import TextLink from "../components/TextLink";
import { ITransaction } from "../storage/database/transaction";
import { blixtTheme } from ".././native-base-theme/variables/commonColor";
import { PLATFORM } from "../utils/constants";
import { Alert } from "../utils/alert";

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

function MetaDataLightningAddress({ title, data: lightningAddress, url }: IMetaDataProps) {
  const getContactByLightningAddress = useStoreState((actions) => actions.contacts.getContactByLightningAddress);
  const syncContact = useStoreActions((actions) => actions.contacts.syncContact);

  const promptLightningAddressContact = () => {
    if (!lightningAddress) {
      return;
    }

    if (getContactByLightningAddress(lightningAddress)) {
      Alert.alert("",`${lightningAddress} is in your contact list!`);
    } else {
      Alert.alert(
        "Add to Contact List",
        `Would you like to add ${lightningAddress} to your contact list?`,
        [{
          text: "No",
          style: "cancel",
        }, {
          text: "Yes",
          style: "default",
          onPress: async () => {
            console.log(lightningAddress);
            const domain = lightningAddress.split("@")[1] ?? "";
            console.log(domain);
            syncContact({
              type: "PERSON",
              domain,
              lnUrlPay: null,
              lnUrlWithdraw: null,
              lightningAddress: lightningAddress,
              lud16IdentifierMimeType: "text/identifier",
              note: "",
            });
          },
        }],
      );
    }
  };

  return (
    <Text
      style={[style.detailText, {}]}
      onPress={() => {
        Clipboard.setString(lightningAddress);
        toast("Copied to clipboard", undefined, "warning");
      }}
    >
      <Text style={{ fontWeight: "bold" }}>{title}:{"\n"}</Text>
      {lightningAddress}
        <TouchableOpacity onPress={promptLightningAddressContact} style={{justifyContent:"center", paddingLeft: 10, paddingRight: 15 }}>
          <Icon onPress={promptLightningAddressContact} style={{  fontSize: 22, marginBottom: -6 }} type="AntDesign" name={getContactByLightningAddress(lightningAddress) !== undefined ? "check" : "adduser"} />
        </TouchableOpacity>
      </Text>
  );
};

export interface ITransactionDetailsProps {
  navigation: any;
  route: any;
}
export default function TransactionDetails({ route, navigation }: ITransactionDetailsProps) {
  const rHash: string = route.params.rHash;
  const transaction = useStoreState((store) => store.transaction.getTransactionByRHash(rHash));
  const checkOpenTransactions = useStoreActions((store) => store.transaction.checkOpenTransactions);
  const cancelInvoice = useStoreActions((store) => store.receive.cancelInvoice);
  const bitcoinUnit = useStoreState((store) => store.settings.bitcoinUnit);
  const transactionGeolocationMapStyle = useStoreState((store) => store.settings.transactionGeolocationMapStyle);
  const [mapActive, setMapActive] = useState(false);
  const syncTransaction = useStoreActions((store) => store.transaction.syncTransaction);

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

  const onPressCancelInvoice = async () => {
    // There's a LayoutAnimation.configureNext() in the Transaction store
    // to animate the removal of the invoice if hideArchivedInvoices is `true`.
    // React Native cannot figure out which component(s) should have an
    // animation as both the navigation will pop and the invoice
    // will be removed at approximately the same time.
    // So we delay the cancellation for 35ms.
    setTimeout(async () => {
      await cancelInvoice({ rHash: transaction.rHash });
      await checkOpenTransactions();
    }, 35);
    navigation.pop();
  };

  const onPressSetNote = async () => {
    if (PLATFORM === "android") {
      const result = await DialogAndroid.prompt(null, "Set a note for this transaction", {
        defaultValue: transaction.note,
      });
      if (result.action === DialogAndroid.actionPositive) {
        await syncTransaction({
          ...transaction,
          note: result.text?.trim() || null,
        });
      }
    } else {
      Alert.prompt(
        "Note",
        "Set a note for this transaction",
        async (text) => {
          await syncTransaction({
            ...transaction,
            note: text || null,
          });
        },
        "plain-text",
        transaction.note ?? undefined,
      )
    }
  }

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

  const hasCoordinates = transaction.locationLat && transaction.locationLong;

  if (currentScreen === "Overview") {
    return (
      <Blurmodal goBackByClickingOutside={true}>
        <Card style={style.card}>
          <CardItem>
            <ScrollView alwaysBounceVertical={false}>
              <View style={{ display: "flex", flexDirection: "row", justifyContent: "space-between", width: "100%" }}>
                <H1 style={style.header}>
                  Transaction
                </H1>
              </View>
              <View style={{ flexDirection: "row", marginTop: 5, marginBottom: 10 }}>
                <Button small style={style.actionBarButton} onPress={onPressSetNote}>
                  <Text>Set note</Text>
                </Button>
                {transaction.status === "OPEN" &&
                  <Button small danger onPress={onPressCancelInvoice} style={style.actionBarButton}>
                    <Text>Cancel invoice</Text>
                  </Button>
                }
                {hasCoordinates &&
                  <Button small={true} onPress={() => {
                    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                    setCurrentScreen("Map");
                    setTimeout(() => {
                      setMapActive(true);
                    }, 850);
                  }} style={style.actionBarButton}>
                    <Text>Show map</Text>
                  </Button>
                }
              </View>
              <MetaData title="Date" data={formatISO(fromUnixTime(transaction.date.toNumber()))} />
              {transaction.note && <MetaData title="Note" data={transaction.note} />}
              {transaction.website && <MetaData title="Website" data={transaction.website} url={"https://" + transaction.website} />}
              {transaction.type !== "NORMAL" && <MetaData title="Type" data={transaction.type} />}
              {(transaction.type === "LNURL" && transaction.lnurlPayResponse && transaction.lnurlPayResponse.successAction) && <LNURLMetaData transaction={transaction} />}
              {(transaction.nodeAliasCached && name === null) && <MetaData title="Node alias" data={transaction.nodeAliasCached} />}
              {direction === "send" && transaction.lightningAddress && <MetaDataLightningAddress title="Lightning Address" data={transaction.lightningAddress} />}
              {direction === "receive" && !transaction.tlvRecordName && transaction.payer && <MetaData title="Payer" data={transaction.payer} />}
              {direction === "receive" && transaction.tlvRecordName && <MetaData title="Payer" data={transaction.tlvRecordName} />}
              {(direction === "send" && name) && <MetaData title="Recipient" data={name} />}
              {(description !== null && description.length > 0) && <MetaData title="Description" data={description} />}
              <MetaData title="Amount" data={formatBitcoin(transactionValue, bitcoinUnit, bitcoinUnit == "satoshi" || bitcoinUnit == "sat" || bitcoinUnit == "bit" ? true : false)} />
              {transaction.valueFiat != null && transaction.valueFiatCurrency && <MetaData title="Amount in Fiat (Time of Payment)" data={`${transaction.valueFiat.toFixed(2)} ${transaction.valueFiatCurrency}`} />}
              {transaction.fee !== null && transaction.fee !== undefined && <MetaData title="Fee" data={transaction.fee.toString() + " Satoshi"} />}
              {transaction.hops && transaction.hops.length > 0 && <MetaData title="Number of hops" data={transaction.hops.length.toString()} />}
              {direction === "send" && <MetaData title="Remote pubkey" data={transaction.remotePubkey} />}
              <MetaData title="Payment hash" data={transaction.rHash}/>
              {transaction.status === "SETTLED" && transaction.preimage && <MetaData title="Preimage" data={bytesToHexString(transaction.preimage)}/>}
              <MetaData title="Status" data={capitalize(transaction.status)} />
              {transaction.status === "OPEN" && transaction.type !== "LNURL" &&
                <>
                  <View style={{ width: "100%", alignItems: "center", justifyContent: "center" }}>
                    <QrCode size={smallScreen ? 220 : 280} data={transaction.paymentRequest.toUpperCase()} onPress={onQrPress} border={25} />
                  </View>
                  <CopyAddress text={transaction.paymentRequest} onPress={onPaymentRequestTextPress} />
                </>
              }
            </ScrollView>
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
            <ScrollView alwaysBounceVertical={false}>
              <View style={{ marginBottom: 8, display: "flex", flexDirection: "row", justifyContent: "space-between", alignItems: "center",  width: "100%" }}>
                <H1 style={style.header}>
                  Transaction
                </H1>
                <Button small={true} onPress={() => {
                  LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                  setCurrentScreen("Overview");
                  setMapActive(false);
                }}>
                  <Text style={{ fontSize: 9 }}>Go back</Text>
                </Button>
              </View>
              <MapView
                provider={PROVIDER_DEFAULT}
                style={{
                  width: "100%",
                  height: 475,
                  backgroundColor:blixtTheme.gray,
                  opacity: mapActive ? 1 : 0,
                }}
                initialRegion={{
                  longitude: transaction.locationLong!,
                  latitude: transaction.locationLat!,
                  latitudeDelta: 0.00622,
                  longitudeDelta: 0.00251,
                }}
                customMapStyle={MapStyle[transactionGeolocationMapStyle]}
              >
                <MapView.Marker coordinate={{
                  longitude: transaction.locationLong!,
                  latitude: transaction.locationLat!,
                }} />
              </MapView>
            </ScrollView>
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
    minHeight: PLATFORM !== "web" ? "50%" : undefined,
    maxHeight: PLATFORM !== "web" ? "85%" : undefined,
    overflow: "hidden",
  },
  header: {
    fontWeight: "bold",
  },
  detailText: {
    marginBottom: 7,
    ...Platform.select({
      web: {
        wordBreak: "break-all"
      },
    }),
  },
  qrText: {
    marginBottom: 7,
    paddingTop: 4,
    paddingLeft: 18,
    paddingRight: 18,
  },
  actionBarButton: {
    marginLeft: 7,
  }
});

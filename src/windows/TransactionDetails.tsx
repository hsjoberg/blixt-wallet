import React, { useEffect } from "react";
import { StyleSheet, TouchableOpacity, Clipboard, TouchableWithoutFeedback } from "react-native";
import { View } from "react-native";
import { Body, Card, Text, CardItem, H1, Toast, Root } from "native-base";
import { NavigationScreenProp } from "react-navigation";
import BlurOverlay, { closeOverlay, openOverlay } from "../Blur";
import * as QRCode from "qrcode";
import SvgUri from "react-native-svg-uri";

import { useStoreState } from "../state/store";
import { blixtTheme } from "../../native-base-theme/variables/commonColor";
import { fromUnixTime, format } from "date-fns";


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

  useEffect(() => {
    setTimeout(() => {
      openOverlay();
    }, 1);
  }, []);

  if (!transaction) {
    return (
      <></>
    );
  }

  const bolt11payReq: string = (QRCode as any).toString(transaction.paymentRequest.toUpperCase())._55;

  const goBack = () => {
    closeOverlay();
    setTimeout(() => navigation.pop(), 0);
  };

  return (
    <>
      <Root>
        <View style={style.container} touchSoundDisabled={true}>
          <BlurOverlay
            onPress={goBack}
            fadeDuration={200}
            radius={15}
            downsampling={2.07}
            brightness={0}
            customStyles={style.blurOverlay}
            blurStyle="dark"
          >
            <TouchableOpacity style={style.cardCanvas} activeOpacity={1} touchSoundDisabled={true}>
              <Card style={style.card}>
                <CardItem>
                  <Body>
                    <H1 style={style.header}>Transaction</H1>
                    <MetaData title="Date" data={format(fromUnixTime(transaction.date), "yyyy-MM-dd hh:mm")} />
                    <MetaData title="Description" data={transaction.description} />
                    <MetaData title="Amount" data={transaction.value + " Satoshi"} />
                    {transaction.fee !== null &&
                      <MetaData title="Fee" data={transaction.fee + " Satoshi"} />
                    }
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
            </TouchableOpacity>
          </BlurOverlay>
        </View>
      </Root>
    </>
  );
};

const capitalize = (word: string) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();

const style = StyleSheet.create({
  container: {
    position: "absolute",
    flex: 1,
    left: 0,
    top: 0,
    bottom: 0,
    right: 0,
  },
  blurOverlay: {
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  cardCanvas: {
    width: "87%",
  },
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

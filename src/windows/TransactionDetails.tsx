import React, { useEffect } from "react";
import { StyleSheet, TouchableOpacity } from "react-native";
import { View } from "react-native";
import { Body, Card, Text, CardItem, H1 } from "native-base";
import { NavigationScreenProp } from "react-navigation";
import BlurOverlay, { closeOverlay, openOverlay } from "../Blur";
import * as QRCode from "qrcode";
import SvgUri from "react-native-svg-uri";

import { useStoreState } from "../state/store";
import { blixtTheme } from "../../native-base-theme/variables/commonColor";

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

  return (
    <>
      <TouchableOpacity
        style={{
          position: "absolute",
          flex: 1,
          left: 0,
          top: 0,
          bottom: 0,
          right: 0,
          zIndex: 1000,
        }}
      >
        <BlurOverlay
          onPress={() => {
            closeOverlay();
            setTimeout(() => navigation.pop(), 0);
          }}
          fadeDuration={200}
          radius={15}
          downsampling={2.07}
          brightness={0}
          customStyles={style.blurOverlay}
          blurStyle="dark"
        >
          <TouchableOpacity
            style={style.cardCanvas}
            activeOpacity={1}
            >
            <Card style={style.card}>
              <CardItem>
                <Body>
                  <H1 style={style.header}>Transaction</H1>
                  <Text style={style.detailText}>
                    <Text style={{ fontWeight: "bold" }}>Description:{"\n"}</Text>
                    {transaction.description}
                  </Text>
                  <Text style={style.detailText}>
                    <Text style={{ fontWeight: "bold" }}>Amount:{"\n"}</Text>
                    {transaction.value} Satoshi
                  </Text>
                  {transaction.fee &&
                    <Text style={style.detailText}>
                      <Text style={{ fontWeight: "bold" }}>Fee:{"\n"}</Text>
                      {transaction.fee} Satoshi
                    </Text>
                  }
                  <Text style={style.detailText}>
                    <Text style={{ fontWeight: "bold" }}>Remote pubkey{"\n"}</Text>
                    {transaction.remotePubkey}
                  </Text>
                  <Text style={style.detailText}>
                    <Text style={{ fontWeight: "bold" }}>Status:{"\n"}</Text>
                    {capitalize(transaction.status)}
                  </Text>
                  {transaction.status !== "SETTLED" &&
                    <View style={{ alignItems: "center", justifyContent: "center", width: "100%" }}>
                      <SvgUri width={300} height={300} svgXmlData={bolt11payReq} fill={blixtTheme.light} />
                    </View>
                  }
                </Body>
              </CardItem>
            </Card>
          </TouchableOpacity>
        </BlurOverlay>
      </TouchableOpacity>
    </>
  );
};

const capitalize = (word: string) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();

const style = StyleSheet.create({
  blurOverlay: {
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  cardCanvas: {
    width: "85%",
    minHeight: "60%",
    maxHeight: "80%",
  },
  card: {
    padding: 5,
    width: "100%",
    minHeight: "60%",
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

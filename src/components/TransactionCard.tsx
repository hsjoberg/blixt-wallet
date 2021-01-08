import React from "react";
import { StyleSheet, View, Image, Platform } from "react-native";
import { Body, Card, CardItem, Text, Right, Row } from "native-base";

import { fromUnixTime } from "date-fns";
import { ITransaction } from "../storage/database/transaction";
import { blixtTheme } from ".././native-base-theme/variables/commonColor";
import { capitalize, formatISO, isLong } from "../utils";
import { extractDescription } from "../utils/NameDesc";
import { IBitcoinUnits, formatBitcoin, convertBitcoinToFiat } from "../utils/bitcoin-units";
import { useStoreState } from "../state/store";
import { getLightningService } from "../utils/lightning-services";

interface IProps {
  onPress: (id: string) => void;
  transaction: ITransaction;
  unit: keyof IBitcoinUnits;
}
export default function TransactionCard({ onPress, transaction, unit }: IProps) {
  const { date, value, amtPaidSat, status, tlvRecordName } = transaction;
  const positive = value.isPositive();
  let { name, description } = extractDescription(transaction.description);

  const fiatUnit = useStoreState((store) => store.settings.fiatUnit);
  const currentRate = useStoreState((store) => store.fiat.currentRate);
  const preferFiat = useStoreState((store) => store.settings.preferFiat);

  let transactionValue: Long;
  if (isLong(amtPaidSat) && amtPaidSat.greaterThan(0)) {
    transactionValue = amtPaidSat;
  }
  else {
    transactionValue = value;
  }

  // const start = performance.now();
  const lightningService = getLightningService(transaction);
  // console.log("Time: " + (performance.now() - start));

  let recipientOrSender;
  if (transaction.note) {
    description = transaction.note;
  }
  else {
    if (lightningService) {
      recipientOrSender = lightningService.title;
    }
    else if (transaction.website) {
      recipientOrSender = transaction.website;
    }
    else if (transaction.value.lessThan(0) && name) {
      recipientOrSender = name;
    }
    else if (transaction.value.greaterThanOrEqual(0) && tlvRecordName) {
      recipientOrSender = tlvRecordName;
    }
    else if (transaction.value.greaterThanOrEqual(0) && transaction.payer) {
      recipientOrSender = transaction.payer;
    }
  }

  return (
    <Card>
      <CardItem activeOpacity={1} button={true} onPress={() => onPress(transaction.rHash)}>
        <Body style={{ flexDirection: "row" }}>
          {lightningService &&
            <View style={transactionStyle.avatarContainer}>
              <Image
                source={{ uri: lightningService.image }}
                style={transactionStyle.avatarImage}
                width={43}
                height={43}
              />
            </View>
          }
          <View style={{ flex: 1 }}>
            <View style={transactionStyle.transactionTop}>
              <Text style={transactionStyle.transactionTopDate}>
                {formatISO(fromUnixTime(date.toNumber()))}
              </Text>
              <Right>
                <Text style={positive ? transactionStyle.transactionTopValuePositive : transactionStyle.transactionTopValueNegative}>
                  {transactionValue.notEquals(0) &&
                    <>
                      {(positive ? "+" : "")}
                      {!preferFiat && formatBitcoin(transactionValue, unit, false)}
                      {preferFiat && convertBitcoinToFiat(transactionValue, currentRate, fiatUnit)}
                    </>
                  }
                </Text>
              </Right>
            </View>
            <View style={{ flex: 1, display: "flex", flexDirection: "row", justifyContent: "space-between", width: "100%" }}>
              <Text note={true} style={transactionStyle.transactionText}>
                {recipientOrSender &&
                  <Text style={{ fontWeight: "bold" }} note={true}>{recipientOrSender}: </Text>
                }
                {description && description.length !== 0
                  ? description
                  : "No description"
                }
              </Text>
              <Text note={true} style={{ marginLeft: 8, marginRight: 0 }}>
                {status !== "SETTLED" && capitalize(status)}
              </Text>
            </View>
          </View>
        </Body>
      </CardItem>
    </Card>
  );
};

const transactionStyle = StyleSheet.create({
  transactionTop: {
    flex: 1,
    flexDirection:"row",
    marginBottom: 8,
  },
  transactionTopDate: {
    // fontWeight: "bold",
    paddingRight: 4,
  },
  transactionTopValuePositive: {
    color: blixtTheme.green,
    // fontSize: 13,
    textAlign: "right",
  },
  transactionTopValueNegative: {
    color: blixtTheme.red,
    // fontSize: 13,
    textAlign: "right",
  },
  avatarContainer: {
    width: 50,
    alignSelf:"center",
    marginTop: 2,
    marginRight: 7,
    marginLeft: -2,
  },
  avatarImage: {
    width: 43,
    height: 43,
    borderRadius: 22,
  },
  transactionText: {
    flex: 1,
    marginRight: 0,
    ...Platform.select({
      web: {
        wordBreak: "break-all",
      },
    }),
  },
});

import React from "react";
import { StyleSheet, View } from "react-native";
import { Body, Card, CardItem, Text, Right, Row } from "native-base";

import { fromUnixTime } from "date-fns";
import { ITransaction } from "../storage/database/transaction";
import { blixtTheme } from "../../native-base-theme/variables/commonColor";
import { capitalize, formatISO, isLong } from "../utils";
import { extractDescription } from "../utils/NameDesc";
import { IBitcoinUnits, formatBitcoin, convertBitcoinToFiat } from "../utils/bitcoin-units";
import { useStoreState } from "../state/store";

interface IProps {
  onPress: (id: string) => void;
  transaction: ITransaction;
  unit: keyof IBitcoinUnits;
}
export default function TransactionCard({ onPress, transaction, unit }: IProps) {
  const { date, value, amtPaidSat, status, tlvRecordName } = transaction;
  const positive = value.isPositive();
  const { name, description } = extractDescription(transaction.description);

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

  return (
    <Card>
      <CardItem activeOpacity={1} button={true} onPress={() => onPress(transaction.rHash)}>
        <Body>
          <Row style={transactionStyle.transactionTop}>
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
          </Row>
          <View style={{ flex: 1, display: "flex", flexDirection: "row", justifyContent: "space-between", width: "100%" }}>
            <Text note={true} style={{ flex: 1, marginRight:0 }}>
              {/*transaction.nodeAliasCached && transaction.nodeAliasCached + ": "*/}
              {transaction.website &&
                <Text note={true}>{/*To */}<Text style={{ fontWeight: "bold" }} note={true}>{transaction.website}: </Text></Text>
              }
              {!transaction.website && transaction.value.lessThan(0) && name &&
                <Text note={true}>{/*To */}<Text style={{ fontWeight: "bold" }} note={true}>{name}: </Text></Text>
              }
              {!transaction.website && transaction.value.greaterThanOrEqual(0) && tlvRecordName &&
                <Text note={true}>{/*From */}<Text style={{ fontWeight: "bold" }} note={true}>{tlvRecordName}: </Text></Text>
              }
              {!transaction.website && transaction.value.greaterThanOrEqual(0) && !tlvRecordName && transaction.payer &&
                <Text note={true}>{/*From */}<Text style={{ fontWeight: "bold" }} note={true}>{transaction.payer}: </Text></Text>
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
        </Body>
      </CardItem>
    </Card>
  );
};

const transactionStyle = StyleSheet.create({
  transactionTop: {
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
});

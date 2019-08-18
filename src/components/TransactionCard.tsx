import React from "react";
import { StyleSheet, View } from "react-native";
import { Body, Card, CardItem, Text, Right, Row } from "native-base";

import { fromUnixTime } from "date-fns";
import { ITransaction } from "../storage/database/transaction";
import { blixtTheme } from "../../native-base-theme/variables/commonColor";
import { capitalize, formatISO } from "../utils";
import { extractDescription } from "../utils/NameDesc";
import { IBitcoinUnits, formatBitcoin } from "../utils/bitcoin-units";

interface IProps {
  onPress: (id: string) => void;
  transaction: ITransaction;
  unit: keyof IBitcoinUnits;
}
export default ({ onPress, transaction, unit }: IProps) => {
  const { date, value, status } = transaction;
  const positive = value.isPositive();
  const { name, description } = extractDescription(transaction.description);

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
                {value.notEquals(0) && (positive ? "+" : "")}
                {value.notEquals(0) && formatBitcoin(value, unit)}
              </Text>
            </Right>
          </Row>
          <View style={{ flex: 1, display: "flex", flexDirection: "row", justifyContent: "space-between", width: "100%" }}>
            <Text note={true}>
              {/*transaction.nodeAliasCached && transaction.nodeAliasCached + ": "*/}
              {transaction.value.lessThan(0) && name && <Text style={{ fontWeight: "bold" }} note={true}>{name}: </Text>}
              {description && description.length !== 0
                ? description
                : "No description"
              }
            </Text>
            <Text note={true} style={{ marginRight: 0 }}>
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
  },
  transactionTopValueNegative: {
    color: blixtTheme.red,
  },
  transactionOnChain: {
    fontSize: 13,
    marginTop: 3,
    paddingRight: 5,
  },
});

import React from "react";
import { StyleSheet, View } from "react-native";
import { Body, Card, CardItem, Text, Right, Row } from "native-base";

import { fromUnixTime } from "date-fns";
import { ITransaction } from "../storage/database/transaction";
import { blixtTheme } from "../../native-base-theme/variables/commonColor";
import { capitalize, formatISO } from "../utils";

interface IProps {
  onPress: (id: string) => void;
  transaction: ITransaction;
}
export default ({ onPress, transaction }: IProps) => {
  const {
    date,
    value,
    description,
    status,
  } = transaction;

  const positive = value.isPositive();

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
                {value.notEquals(0) && value + " Sat"}
              </Text>
            </Right>
          </Row>
          <View style={{ flex: 1, display: "flex", flexDirection: "row", justifyContent: "space-between", width: "100%" }}>
            <Text note={true}>
              {/*transaction.nodeAliasCached && transaction.nodeAliasCached + ": "*/}
              {description || "No description"}
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

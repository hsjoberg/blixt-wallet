import React from "react";
import { Alert, StyleSheet, View } from "react-native";
import { Body, Card, CardItem, Text, Right, Icon } from "native-base";
import { Col, Row, Grid } from "react-native-easy-grid";

interface IProps {
  onPress: (id: string) => void;
}

export default ({ onPress }: IProps) => {
  return (
    <>
      <Card>
        <CardItem button={true} onPress={() => onPress("test")}>
          <Body>
            <Row style={transaction.transactionTop}>
              {/*<Icon type="AntDesign" name="minuscircleo" style={{ ...transaction.typeIcon, ...transaction.typeIconSend}} />*/}
              <Text style={transaction.transactionTopDate}>2019-01-01</Text>
              <Right>
                <Text style={transaction.transactionTopValueNegative}>
                  - 0 00000001 ₿
                </Text>
              </Right>
            </Row>
            <Text note={true}>
               Satoshis.club article "Bitcoin Mining will help kickstart renewable energy projects"
            </Text>
          </Body>
        </CardItem>
      </Card>
      <Card>
        <CardItem button={true} onPress={() => onPress("test")}>
          <Body>
            <Row style={transaction.transactionTop}>
              {/*<Icon type="AntDesign" name="pluscircleo" style={{ ...transaction.typeIcon, ...transaction.typeIconReceive}} />*/}
              <Text style={transaction.transactionTopDate}>2019-01-01</Text>
              <Right>
                <Text style={transaction.transactionTopValuePositive}>
                  + 0 00000001 ₿
                </Text>
              </Right>
            </Row>
            <Text note={true}>
               Lunch with Alice
            </Text>
          </Body>
        </CardItem>
      </Card>
      <Card>
        <CardItem button={true} onPress={() => onPress("test")}>
          <Body>
            <Row style={transaction.transactionTop}>
              <Text style={transaction.transactionTopDate}>2019-01-01</Text>
              <Right>
                <View style={{flex: 1, flexDirection: "row"}}>
                  <Text style={transaction.transactionOnChain} note={true}>onchain</Text>
                  <Text style={transaction.transactionTopValuePositive}>
                    + 0 00000001 ₿
                  </Text>
                </View>
              </Right>
            </Row>
            <Text note={true}>
               From 1F1tAaz5x1HUXrCNLbtMDqcw6o5GNn4xqX
            </Text>
          </Body>
        </CardItem>
      </Card>
      <Card>
        <CardItem button={true} onPress={() => onPress("test")}>
          <Body>
            <Row style={transaction.transactionTop}>
              <Text style={transaction.transactionTopDate}>2019-01-01</Text>
              <Right>
                <View style={{flex: 1, flexDirection: "row"}}>
                  <Text style={transaction.transactionOnChain} note={true}>onchain 0/6</Text>
                  <Text style={transaction.transactionTopValuePositive}>
                    + 0 00000001 ₿
                  </Text>
                </View>
              </Right>
            </Row>
            <Text note={true}>
               From 1F1tAaz5x1HUXrCNLbtMDqcw6o5GNn4xqX
            </Text>
          </Body>
        </CardItem>
      </Card>
    </>
  );
};

const transaction = StyleSheet.create({
  transactionTop: {
    marginBottom: 8,
  },
  transactionTopDate: {
    fontWeight: "bold",
    paddingRight: 4,
  },
  transactionTopValuePositive: {
    color: "green",
//    fontSize: 18
  },
  transactionTopValueNegative: {
    color: "red",
  },
  transactionOnChain: {
    fontSize: 13,
    marginTop: 3,
    paddingRight: 5,
  },
  typeIcon: {
    fontSize: 13,
    paddingTop: 5,
    paddingRight: 5,
  },
  typeIconSend: {
    color: "red",
  },
  typeIconReceive: {
    color: "green",
  },
});

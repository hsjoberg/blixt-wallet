import React, { Component, useState, useRef } from "react";
import { Alert, Platform, Modal, StyleSheet, View, TouchableHighlight, Image, ScrollView } from "react-native";
import { Badge, Body, Button, Card, CardItem, Container, Content, Icon, Item, Text, H1, H3, Right } from "native-base";
import { Col, Row, Grid } from "react-native-easy-grid";

export default () => {
  return (
    <Grid style={style.grid}>
      <Row style={{ height: 200 }}>
        <Col style={style.top}>
          <View style={StyleSheet.absoluteFill}>
            <Icon style={style.onchainIcon} type="FontAwesome" name="btc" onPress={() => Alert.alert("Bitcoin")} />
            <Icon style={style.settingsIcon} type="AntDesign" name="setting" onPress={() => Alert.alert("Settings")} />
          </View>
          <Text style={header.btc}>1.234 567 89 ₿</Text>
          <H3 style={header.fiat}>200 SEK</H3>
        </Col>
      </Row>
      <Row>
        <ScrollView>
        <Col style={style.transactionList}>
          <Card>
            <CardItem button={true} onPress={() => Alert.alert("Transaction")}>
              <Body>
                <Row style={transaction.transactionTop}>
                  <Text style={transaction.transactionTopDate}>2019-01-01 10:00&nbsp;
                  </Text>
                  <Text style={transaction.transactionTopValueNegative}>
                    -0.01 ₿
                  </Text>
                </Row>
                <Text>
                   To:{"\n   "}Bob
                </Text>
              </Body>
            </CardItem>
          </Card>
          <Card>
            <CardItem button={true} onPress={() => Alert.alert("Transaction")}>
              <Body>
                <Row style={transaction.transactionTop}>
                  <Text style={transaction.transactionTopDate}>2019-01-01 10:00&nbsp;
                  </Text>
                  <Text style={transaction.transactionTopValuePositive}>
                    +0.01 ₿
                  </Text>
                </Row>
                <Text>
                   From:{"\n   "}Alice
                </Text>
              </Body>
            </CardItem>
          </Card>
          <Card>
            <CardItem button={true} onPress={() => Alert.alert("Transaction")}>
              <Body>
                <Row style={transaction.transactionTop}>
                  <Text style={transaction.transactionTopDate}>2019-01-01 10:00&nbsp;
                  </Text>
                  <Text style={transaction.transactionTopValuePositive}>
                    +0.01 ₿
                  </Text>
                  <Right>
                    <Text style={transaction.transactionOnChain} note>onchain</Text>
                  </Right>
                </Row>
                <Text>
                   From:{"\n   "}1F1tAaz5x1HUXrCNLbtMDqcw6o5GNn4xqX
                </Text>
              </Body>
            </CardItem>
          </Card>
          <Card>
            <CardItem button={true} onPress={() => Alert.alert("Transaction")}>
              <Body>
                <Row style={transaction.transactionTop}>
                  <Text style={transaction.transactionTopDate}>2019-01-01 10:00&nbsp;
                  </Text>
                  <Text style={transaction.transactionTopValueNegative}>
                    -0.01 ₿
                  </Text>
                </Row>
                <Text>
                   To:{"\n   "}Bob
                </Text>
              </Body>
            </CardItem>
          </Card>
          <Card>
            <CardItem button={true} onPress={() => Alert.alert("Transaction")}>
              <Body>
                <Row style={transaction.transactionTop}>
                  <Text style={transaction.transactionTopDate}>2019-01-01 10:00&nbsp;
                  </Text>
                  <Text style={transaction.transactionTopValuePositive}>
                    +0.01 ₿
                  </Text>
                </Row>
                <Text>
                   From:{"\n   "}Alice
                </Text>
              </Body>
            </CardItem>
          </Card>
          <Card>
            <CardItem button={true} onPress={() => Alert.alert("Transaction")}>
              <Body>
                <Row style={transaction.transactionTop}>
                  <Text style={transaction.transactionTopDate}>2019-01-01 10:00&nbsp;
                  </Text>
                  <Text style={transaction.transactionTopValuePositive}>
                    +0.01 ₿
                  </Text>
                  <Right>
                    <Text style={transaction.transactionOnChain} note>onchain</Text>
                  </Right>
                </Row>
                <Text>
                   From:{"\n   "}1F1tAaz5x1HUXrCNLbtMDqcw6o5GNn4xqX
                </Text>
              </Body>
            </CardItem>
          </Card>
          <Card>
            <CardItem button={true} onPress={() => Alert.alert("Transaction")}>
              <Body>
                <Row style={transaction.transactionTop}>
                  <Text style={transaction.transactionTopDate}>2019-01-01 10:00&nbsp;
                  </Text>
                  <Text style={transaction.transactionTopValueNegative}>
                    -0.01 ₿
                  </Text>
                </Row>
                <Text>
                   To:{"\n   "}Bob
                </Text>
              </Body>
            </CardItem>
          </Card>
          <Card>
            <CardItem button={true} onPress={() => Alert.alert("Transaction")}>
              <Body>
                <Row style={transaction.transactionTop}>
                  <Text style={transaction.transactionTopDate}>2019-01-01 10:00&nbsp;
                  </Text>
                  <Text style={transaction.transactionTopValuePositive}>
                    +0.01 ₿
                  </Text>
                </Row>
                <Text>
                   From:{"\n   "}Alice
                </Text>
              </Body>
            </CardItem>
          </Card>
          <Card>
            <CardItem button={true} onPress={() => Alert.alert("Transaction")}>
              <Body>
                <Row style={transaction.transactionTop}>
                  <Text style={transaction.transactionTopDate}>2019-01-01 10:00&nbsp;
                  </Text>
                  <Text style={transaction.transactionTopValuePositive}>
                    +0.01 ₿
                  </Text>
                  <Right>
                    <Text style={transaction.transactionOnChain} note>onchain</Text>
                  </Right>
                </Row>
                <Text>
                   From:{"\n   "}1F1tAaz5x1HUXrCNLbtMDqcw6o5GNn4xqX
                </Text>
              </Body>
            </CardItem>
          </Card>
        </Col>
      </ScrollView>
      </Row>
    </Grid>
  );
};


const style = StyleSheet.create({
  grid: {
    flex: 1,
    width: "100%",
    height: "100%",
    backgroundColor: "#EFEFEF",
  },
  top: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    height: 200,
    backgroundColor: "#FCFCFC",
  },
  onchainIcon: {
    position: "absolute",
    top: 9,
    left : 9,
    fontSize: 24,
    color: "#d3a100",
  },
  settingsIcon: {
    position: "absolute",
    top: 9,
    right: 9,
    fontSize: 24,
    color: "#2b3751"
  },
  transactionList: {
    flex: 1,
    justifyContent: "flex-start",
    padding: 8,
  },
});

const header = StyleSheet.create({
  btc: {
    fontSize: 36,
    marginTop: 16,
    marginBottom: 7,
  },
  fiat: {
    color: "#666"
  }
});

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
    paddingRight: 8,
  },
  transactionTopValueNegative: {
    color: "red",
    paddingRight: 8,
  },
  transactionOnChain: {
    marginTop: 1,
  },
});

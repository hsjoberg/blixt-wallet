import React, { Component, useState } from "react";
import { Alert,  StyleSheet, View, ScrollView, FlatList } from "react-native";
import { Body, Text, Header, Container, Left, Button, Title, Right, Icon, H1, Content, H2, H3, Fab, Card, CardItem, ListItem, List } from "native-base";
import { Col, Row, Grid } from "react-native-easy-grid";

interface IReceiveProps {
  onGoBackCallback: () => void;
}


const Detail = ({ title, children }) => {
  return (
    <View style={style.channelDetail}>
      <Text style={style.channelDetailTitle}>{title}</Text>
      <Text style={{...style.channelDetailValue, color: "green"}}>{children}</Text>
    </View>
  )
};

const NodeCard = () => {
  return (
    <Card style={style.channelCard}>
      <CardItem style={style.channelDetail}>
        <Body>
          <Row>
            <Left>
              <Text style={style.channelDetailTitle}>Node</Text>
            </Left>
            <Right>
              <Text style={style.channelDetailValue}>0284d56a5e007ff...</Text>
            </Right>
          </Row>
          <Row>
            <Left>
              <Text style={style.channelDetailTitle}>Status</Text>
            </Left>
            <Right>
              <Text style={{...style.channelDetailValue, color: "green"}}>Connected</Text>
            </Right>
          </Row>
          <Row>
            <Left>
              <Text style={style.channelDetailTitle}>Amount in channel</Text>
            </Left>
            <Right>
              <Text style={style.channelDetailValue}>1000 sat</Text>
            </Right>
          </Row>
          <Row>
            <Left>
              <Text style={style.channelDetailTitle}>Current IP</Text>
            </Left>
            <Right>
              <Text style={style.channelDetailValue}>54.69.116.154:9735</Text>
            </Right>
          </Row>
        </Body>
      </CardItem>
    </Card>
  );
};

export default ({ onGoBackCallback }: IReceiveProps) => {
  const [fabActive, setFabActive] = useState(false);

  return (
    <Container>
      <Header>
        <Left>
          <Button transparent={true} onPress={onGoBackCallback}>
            <Icon name="arrow-back" />
          </Button>
        </Left>
        <Body>
          <Title>Lightning Network</Title>
        </Body>
      </Header>
      <ScrollView contentContainerStyle={style.container}>
        <View style={style.balanceInfo}>
          <H1 style={style.spendableTitle}>Spendable amount</H1>
          <H3 style={style.spendable}>100 000 satoshi</H3>
        </View>
        <NodeCard />
        <NodeCard />
        <NodeCard />
        <NodeCard />
        <NodeCard />
        <NodeCard />
      </ScrollView>
      <Fab
        active={fabActive}
        style={{ backgroundColor: "#5cb85c" }}
        position="bottomRight"
        onPress={() => setFabActive(!fabActive)}>
        <Icon type="Entypo" name="plus" />
      </Fab>
    </Container>
  );
};

const style = StyleSheet.create({
  container: {

    padding: 16,
  },
  balanceInfo: {
    alignItems: "center",
    padding: 16,
  },
  spendableTitle: {
    marginBottom: 8,
  },
  spendable: {
  },
  channelCard: {
    width: "100%",
    marginTop: 8,
  },
  channelDetail: {
  },
  channelDetails: {
    fontSize: 16,
  },
  channelDetailTitle: {
  },
  channelDetailValue: {
  },
});

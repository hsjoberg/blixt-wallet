import React, { useState } from "react";
import { StyleSheet, View, ScrollView } from "react-native";
import { Body, Text, Header, Container, Left, Button, Title, Right, Icon, H1, H3, Fab, Card, CardItem } from "native-base";
import { Row } from "react-native-easy-grid";
import { NavigationScreenProp } from "react-navigation";

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

interface IReceiveProps {
  navigation: NavigationScreenProp<{}>;
}
export default ({ navigation }: IReceiveProps) => {
  const [fabActive, setFabActive] = useState(false);

  return (
    <Container>
      <Header iosBarStyle="light-content">
        <Left>
          <Button transparent={true} onPress={() => navigation.navigate("Main")}>
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

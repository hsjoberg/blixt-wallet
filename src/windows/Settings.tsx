import React, { useState, useEffect } from "react";
import { CheckBox, StyleSheet, NativeModules } from "react-native";
import { Button, Body, Container, Icon, Header, Text, Title, Left, Content, Root, List, ListItem, Right, View, } from "native-base";

import { createStackNavigator, NavigationScreenProp } from "react-navigation";

import LndLog from "./LndLog";

interface ISettingsProps {
  navigation: NavigationScreenProp<{}>;
}
const Settings = ({ navigation }: ISettingsProps) => {
  const [lndActive, setLndActive] = useState();

  useEffect(() => {
    (async () => {
      try {
        await NativeModules.LndGrpc.getInfo();
        setLndActive("green");
      } catch {
        setLndActive("red");
      }
    })();
  }, []);

  return (
    <Root>
      <Container>
        <Header iosBarStyle="light-content">
          <Left>
            <Button transparent={true} onPress={() => navigation.pop()}>
              <Icon name="arrow-back" />
            </Button>
          </Left>
          <Body>
            <Title>Settings</Title>
          </Body>
        </Header>
        <Content>
          <View style={{ width: "100%", display: "flex", flexDirection: "row", flexWrap: "wrap" }}>
            <Button onPress={() => navigation.navigate("DEV_InitApp")}><Text>Go to dev screen</Text></Button>
            <Button style={{backgroundColor: lndActive}}
              onPress={async () => {
                try {
                  await NativeModules.LndGrpc.getInfo();
                  setLndActive("green");
                } catch {
                  setLndActive("red");
                }
              }}>
              <Text />
            </Button>
          </View>
          <List>
            <ListItem style={style.itemHeader} itemHeader={true} first={true}>
              <Text>Wallet</Text>
            </ListItem>

            <ListItem button={true} icon={true} onPress={() => {}}>
              <Left><Icon style={{fontSize: 22}} type="AntDesign" name="lock" /></Left>
              <Body><Text>Set pincode</Text></Body>
            </ListItem>
            <ListItem button={true} icon={true} onPress={() => {}}>
              <Left><Icon style={{fontSize: 22}} type="Entypo" name="fingerprint" /></Left>
              <Body><Text>Login with fingerprint</Text></Body>
              <Right><CheckBox /></Right>
            </ListItem>
            <ListItem last={true} button={true} icon={true} onPress={() => {}}>
              <Left><Icon style={{fontSize: 22}} type="AntDesign" name="form" /></Left>
              <Body>
                <Text>Show mnemonic</Text>
                <Text note={true} numberOfLines={1}>Show 24-word seed for this wallet</Text>
              </Body>
            </ListItem>


            <ListItem style={style.itemHeader} itemHeader={true}>
              <Text>Display</Text>
            </ListItem>

            <ListItem icon={true} onPress={() => {}}>
              <Left><Icon style={{fontSize: 22}} type="FontAwesome" name="money" /></Left>
              <Body>
                <Text>Fiat currency</Text>
                <Text note={true} numberOfLines={1}>USD</Text>
              </Body>
            </ListItem>
            <ListItem last={true} icon={true} onPress={() => {}}>
              <Left><Icon style={{fontSize: 22}} type="FontAwesome5" name="btc" /></Left>
              <Body>
                <Text>Bitcoin unit</Text>
                <Text note={true} numberOfLines={1}>Bitcoin</Text>
              </Body>
            </ListItem>


            <ListItem style={style.itemHeader} itemHeader={true}>
              <Text>Bitcoin Network</Text>
            </ListItem>

            <ListItem icon={true} onPress={() => {}}>
              <Left><Icon style={{fontSize: 22}} type="AntDesign" name="team" /></Left>
              <Body><Text>Show current network peer(s)</Text></Body>
            </ListItem>
            <ListItem icon={true} last={true} onPress={() => {}}>
              <Left><Icon style={{fontSize: 22}} type="AntDesign" name="customerservice" /></Left>
              <Body><Text>Set trusted Node for SPV</Text></Body>
            </ListItem>


            <ListItem style={style.itemHeader} itemHeader={true}>
              <Text>Lightning Network</Text>
            </ListItem>

            <ListItem icon={true} onPress={() => {}}>
              <Left><Icon style={{fontSize: 22}} type="AntDesign" name="user" /></Left>
              <Body><Text>Show node data</Text></Body>
            </ListItem>
            <ListItem icon={true} onPress={() => {}}>
              <Left><Icon style={{fontSize: 22}} type="AntDesign" name="edit" /></Left>
              <Body><Text>Payment request default description</Text></Body>
            </ListItem>
            <ListItem button={true} icon={true} onPress={() => {}}>
              <Left><Icon style={{fontSize: 22}} type="Entypo" name="circular-graph" /></Left>
              <Body><Text>Automatically open channels</Text></Body>
              <Right><CheckBox value={true} /></Right>
            </ListItem>
            <ListItem button={true} icon={true} onPress={() => {}}>
              <Left><Icon style={{fontSize: 22}} type="Entypo" name="fingerprint" /></Left>
              <Body><Text>Backup channels to Google Drive</Text></Body>
              <Right><CheckBox value={true} /></Right>
            </ListItem>


            <ListItem style={style.itemHeader} itemHeader={true}>
              <Text>Advanced</Text>
            </ListItem>

            <ListItem icon={true} onPress={() => navigation.navigate("LndLog")}>
              <Left><Icon style={{fontSize: 22}} type="Entypo" name="text" /></Left>
              <Body><Text>Open lnd log</Text></Body>
            </ListItem>


            <ListItem style={style.itemHeader} itemHeader={true}>
              <Text>Misc.</Text>
            </ListItem>

            <ListItem icon={true} onPress={() => {}}>
              <Left><Icon style={{fontSize: 22}} type="AntDesign" name="info" /></Left>
              <Body><Text>About</Text></Body>
            </ListItem>
          </List>
        </Content>
      </Container>
    </Root>
  );
}

export default createStackNavigator({
  Settings,
  LndLog,
}, {
  headerMode: "none",
  initialRouteName: "Settings",
});

const style = StyleSheet.create({
  itemHeader: {
    paddingTop: 24,
    paddingBottom: 16,
  },
});

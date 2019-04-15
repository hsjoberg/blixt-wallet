import React, { useState, useRef } from "react";
import { CheckBox, View, Touchable, TouchableHighlight, Share, Clipboard, Alert, StatusBar } from "react-native";
import { Button, Body, Container, Icon, Header, Text, Title, Left, Content, Form, Item, Label, Input, H1, H3, Toast, Root, List, ListItem, Right, Switch } from "native-base";

interface IProps {
  onGoBackCallback: () => void;
}

export default ({ onGoBackCallback }: IProps) => {
  return (
    <Root>
      <Container>
        <Header>
          <Left>
            <Button transparent={true} onPress={onGoBackCallback}>
              <Icon name="arrow-back" />
            </Button>
          </Left>
          <Body>
            <Title>Settings</Title>
          </Body>
        </Header>
        <Content>
          <List>
            <ListItem itemHeader={true} first={true}>
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
                <Text note={true} numberOfLines={1}>Show 12-word seed for this wallet</Text>
              </Body>
            </ListItem>


            <ListItem first={true} itemHeader={true}>
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


            <ListItem itemHeader={true}>
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


            <ListItem itemHeader={true}>
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
              <Left><Icon style={{fontSize: 22}} type="Entypo" name="fingerprint" /></Left>
              <Body><Text>Backup channels to Google Drive</Text></Body>
              <Right><CheckBox value={true} /></Right>
            </ListItem>


            <ListItem itemHeader={true}>
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
};

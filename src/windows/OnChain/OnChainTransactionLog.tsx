import React, { useEffect } from "react";
import { FlatList, StyleSheet, View, Clipboard } from "react-native";
import { Body, Text, Header, Container, Content, H1, H3, Right, Left, Button, Title, Icon, Toast } from "native-base";
import { NavigationScreenProp, createStackNavigator } from "react-navigation";
import * as QRCode from "qrcode";
import SvgUri from "react-native-svg-uri";

import OnChainTransactionItem from "../../components/OnChainTransactionItem";
import { blixtTheme } from "../../../native-base-theme/variables/commonColor";
import { useStoreState, useStoreActions } from "../../state/store";

export interface IOnChainTransactionLogProps {
  navigation: NavigationScreenProp<{}>;
}
export const OnChainTransactionLog = ({ navigation }: IOnChainTransactionLogProps) => {
  const transactions = useStoreState((store) => store.onChain.transactions);
  const getTransactions = useStoreActions((store) => store.onChain.getTransactions);

  useEffect(() => {
    (async () => {
      await getTransactions(undefined);
    })();
  }, [getTransactions]);

  return (
    <Container>
      <Header iosBarStyle="light-content" translucent={false}>
        <Left>
          <Button transparent={true} onPress={() => navigation.pop()}>
            <Icon name="arrow-back" />
          </Button>
        </Left>
        <Body>
          <Title>Transaction Log</Title>
        </Body>
        <Right>
          <Button transparent={true} onPress={async () => await getTransactions(undefined)}>
            <Icon name="sync" />
          </Button>
        </Right>
      </Header>
      <Content>
        <FlatList
          style={{ padding: 12 }}
          data={transactions.sort((tx1, tx2) => tx2.timeStamp - tx1.timeStamp)}
          renderItem={({ item: transaction }) => <OnChainTransactionItem key={transaction.txHash!} transaction={transaction} />}
          keyExtractor={(transaction, i) => transaction.txHash! + i}
        />
      </Content>
    </Container>
  );
};

export default OnChainTransactionLog;

import React, { useEffect } from "react";
import { FlatList } from "react-native";
import { Body, Header, Container, Content, Right, Left, Button, Title, Icon } from "native-base";
import { NavigationScreenProp } from "react-navigation";

import OnChainTransactionItem from "../../components/OnChainTransactionItem";
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

  const onTransactionPress = (txId: string) => {
    navigation.navigate("OnChainTransactionDetails", { txId });
  }

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
          data={transactions.sort((tx1, tx2) => tx2.timeStamp!.toNumber() - tx1.timeStamp!.toNumber())}
          renderItem={({ item: transaction }) => (
            <OnChainTransactionItem
              key={transaction.txHash!}
              transaction={transaction}
              onPress={onTransactionPress}
            />
          )}
          keyExtractor={(transaction, i) => transaction.txHash! + i}
        />
      </Content>
    </Container>
  );
};

export default OnChainTransactionLog;

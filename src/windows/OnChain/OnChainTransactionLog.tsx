import React, { useEffect } from "react";
import { FlatList } from "react-native";
import { Body, Header, Container, Right, Left, Button, Title, Icon } from "native-base";
import { StackNavigationProp } from "@react-navigation/stack";

import { OnChainStackParamList } from "./index";
import OnChainTransactionItem from "../../components/OnChainTransactionItem";
import { useStoreState, useStoreActions } from "../../state/store";

export interface IOnChainTransactionLogProps {
  navigation: StackNavigationProp<OnChainStackParamList, "OnChainTransactionLog">;
}
export const OnChainTransactionLog = ({ navigation }: IOnChainTransactionLogProps) => {
  const rpcReady = useStoreState((store) => store.lightning.rpcReady);
  const transactions = useStoreState((store) => store.onChain.transactions);
  const getTransactions = useStoreActions((store) => store.onChain.getTransactions);
  const bitcoinUnit = useStoreState((store) => store.settings.bitcoinUnit);

  useEffect(() => {
    if (rpcReady) {
      (async () => {
        await getTransactions(undefined);
      })();
    }
  }, [getTransactions, rpcReady]);

  const onTransactionPress = (txId: string) => {
    navigation.navigate("OnChainTransactionDetails", { txId });
  };

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
          <Button transparent={true} onPress={async () => rpcReady && await getTransactions()}>
          <Icon type="MaterialIcons" name="sync" />
          </Button>
        </Right>
      </Header>
      <FlatList
        initialNumToRender={12}
        data={transactions.sort((tx1, tx2) => tx2.timeStamp!.toNumber() - tx1.timeStamp!.toNumber())}
        renderItem={({ item: transaction }) => (
          <OnChainTransactionItem
            key={transaction.txHash! + transaction.type}
            style={{ paddingHorizontal: 8 }}
            transaction={transaction}
            onPress={onTransactionPress}
            unit={bitcoinUnit}
          />
        )}
        keyExtractor={(transaction, i) => transaction.txHash! + transaction.type + i}
      />
    </Container>
  );
};

export default OnChainTransactionLog;

import React, { useEffect, useLayoutEffect } from "react";
import { FlatList, TouchableWithoutFeedback } from "react-native";
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

  useLayoutEffect(() => {
    navigation.setOptions({
      headerTitle: "Transaction Log",
      headerShown: true,
      headerRight: () => {
        return (
          <TouchableWithoutFeedback onPress={async () => rpcReady && await getTransactions()}>
            <Icon type="MaterialIcons" name="sync" style={{ fontSize: 22 }} />
          </TouchableWithoutFeedback>
        )
      }
    });
  }, [navigation]);

  const onTransactionPress = (txId: string) => {
    navigation.navigate("OnChainTransactionDetails", { txId });
  };

  return (
    <Container>
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

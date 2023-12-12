import React, { useEffect, useLayoutEffect } from "react";
import { Container, Icon } from "native-base";
import { StackNavigationProp } from "@react-navigation/stack";
import { FlashList } from "@shopify/flash-list";

import { OnChainStackParamList } from "./index";
import OnChainTransactionItem from "../../components/OnChainTransactionItem";
import { useStoreState, useStoreActions } from "../../state/store";
import { NavigationButton } from "../../components/NavigationButton";

import { useTranslation } from "react-i18next";
import { namespaces } from "../../i18n/i18n.constants";

export interface IOnChainTransactionLogProps {
  navigation: StackNavigationProp<OnChainStackParamList, "OnChainTransactionLog">;
}
export const OnChainTransactionLog = ({ navigation }: IOnChainTransactionLogProps) => {
  const t = useTranslation(namespaces.onchain.onChainTransactionLog).t;
  const rpcReady = useStoreState((store) => store.lightning.rpcReady);
  const transactions = useStoreState((store) => store.onChain.transactions);
  const getTransactions = useStoreActions((store) => store.onChain.getTransactions);
  const bitcoinUnit = useStoreState((store) => store.settings.bitcoinUnit);

  useEffect(() => {
    if (rpcReady) {
      (async () => {
        await getTransactions();
      })();
    }
  }, [getTransactions, rpcReady]);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerTitle: t("layout.title"),
      headerShown: true,
      headerRight: () => {
        return (
          <NavigationButton onPress={async () => rpcReady && (await getTransactions())}>
            <Icon type="MaterialIcons" name="sync" style={{ fontSize: 22 }} />
          </NavigationButton>
        );
      },
    });
  }, [navigation]);

  const onTransactionPress = (txId: string) => {
    navigation.navigate("OnChainTransactionDetails", { txId });
  };

  return (
    <Container>
      <FlashList
        estimatedItemSize={75}
        data={transactions.sort(
          (tx1, tx2) => tx2.timeStamp!.toNumber() - tx1.timeStamp!.toNumber(),
        )}
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

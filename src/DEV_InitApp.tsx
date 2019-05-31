import React, { useEffect } from "react";
import { StyleSheet, StatusBar } from "react-native";
import { Content, Text, Button } from "native-base";
import { NavigationScreenProp } from "react-navigation";

import { getTransactions, getTransaction, createTransaction } from "./storage/database/transaction";
import { useStore, useActions } from "./state/store";

interface IProps {
  navigation: NavigationScreenProp<{}>;
}
export default ({ navigation }: IProps) => {
  const actions = useActions((store) => store);
  const db = useStore((store) => store.db);

  useEffect(() => {
    (async () => {
      try {
        await actions.initializeApp();
      }
      catch (e) {
        console.log(e);
      }
    })();
  }, []);

  console.log("DB", db);

  return (
    <Content contentContainerStyle={styles.content}>
      <StatusBar
        backgroundColor="transparent"
        hidden={false}
        translucent={true}
        networkActivityIndicatorVisible={true}
        barStyle="dark-content"
      />
      <Text>InitApp</Text>
      <Button onPress={async () => actions.clearApp()}><Text>actions.clearApp()</Text></Button>
      <Button onPress={async () => actions.initializeApp()}><Text>actions.initializeApp()</Text></Button>
      <Button onPress={async () => console.log(await createTransaction(db!, {
        date: 1546300800 + Number.parseInt(Math.random() * 1000, 10), // 2019-01-01 00:00:00
        description: "Test transaction",
        remotePubkey: "02ad5e3811fb075e69fe2f038fcc1ece7dfb47150a3b20698f3e9845ef6b6283b6",
        expire: 1577836800 + Number.parseInt(Math.random() * 1000, 10), // 2020-01-01 00:00:00
        memo: "Memo",
        status: "PAID",
        value:  1,
        valuteMsat: 1000,
      }))}><Text>createTransaction()</Text></Button>
      <Button onPress={async () => console.log(await getTransactions(db!))}><Text>getTransactions()</Text></Button>
      <Button onPress={async () => console.log(await getTransaction(db!, 1))}><Text>getTransaction(1)</Text></Button>
      <Button onPress={async () => navigation.navigate("InitLightning")}><Text>navigation.navigate("InitLightning")</Text></Button>
    </Content>
  );
};

const styles = StyleSheet.create({
  content: {
    flex: 1,
    height: "100%",
    backgroundColor: "#EFEFEF",
    justifyContent: "center",
    alignItems: "center",
  },
});

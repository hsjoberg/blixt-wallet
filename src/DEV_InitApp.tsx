import React, { useEffect, useState } from "react";
import { AppState, StyleSheet, StatusBar, DeviceEventEmitter, NativeModules, ScrollView, Clipboard } from "react-native";
import { Content, Text, Button, Toast, Root, Input, View } from "native-base";
import { NavigationScreenProp } from "react-navigation";

import { getTransactions, getTransaction, createTransaction } from "./storage/database/transaction";
import { useStoreState, useStoreActions } from "./state/store";

// (async () => {
//   AppState.addEventListener("change", (e) => {
//     console.log("CHANGE");
//     console.log(e);
//   });
// })();


interface IProps {
  navigation: NavigationScreenProp<{}>;
}
export default ({ navigation }: IProps) => {
  const [connectPeer, setConnectPeer] = useState("");
  const [sat, setSat] = useState("");
  const [addr, setAddr] = useState("");
  const [tx, setTx] = useState("");
  const [commandResult, setCommandResult] = useState("{}");
  const [error, setError] = useState("{}");
  const actions = useStoreActions((store) => store);
  const db = useStoreState((store) => store.db);

  useEffect(() => {
    (async () => {
      try {

      }
      catch (e) {
        console.log(e);
      }
    })();
  }, []);

  return (
    <Root>
    <ScrollView contentContainerStyle={styles.content}>
      <StatusBar
        backgroundColor="transparent"
        hidden={false}
        translucent={false}
        networkActivityIndicatorVisible={true}
        barStyle="dark-content"
      />
      <View style={{ marginTop: 32, width: "100%", display: "flex", flexDirection: "row", flexWrap: "wrap" }}>
        <Button onPress={async () => actions.clearApp()}><Text>actions.clearApp()</Text></Button>
        <Button onPress={async () => await actions.initializeApp()}><Text>actions.initializeApp()</Text></Button>
        <Button onPress={async () => console.log(await createTransaction(db!, {
          date: 1546300800 + Math.floor(Math.random() * 1000), // 2019-01-01 00:00:00
          description: "Test transaction",
          remotePubkey: "02ad5e3811fb075e69fe2f038fcc1ece7dfb47150a3b20698f3e9845ef6b6283b6",
          expire: 1577836800 + Math.floor(Math.random() * 1000), // 2020-01-01 00:00:00
          status: "SETTLED",
          value:  Math.floor(Math.random() * 1000) - Math.floor(Math.random() * 1000),
          valueMsat: 1000,
          paymentRequest: "abcdef123456",
          rHash: "abcdef123456",
        }))}><Text>createTransaction()</Text></Button>
        <Button onPress={async () => console.log(await getTransactions(db!))}><Text>getTransactions()</Text></Button>
        <Button onPress={async () => console.log(await getTransaction(db!, 1))}><Text>getTransaction(1)</Text></Button>
        <Button onPress={async () => navigation.navigate("Init")}><Text>navigation.navigate("Init")</Text></Button>
        <Button onPress={async () => navigation.navigate("Overview")}><Text>navigation.navigate("Overview")</Text></Button>
        <Button onPress={async () => navigation.navigate("InitLightning")}><Text>navigation.navigate("InitLightning")</Text></Button>

        <Button onPress={async () => {
          try {
            const result = await NativeModules.LndProcessStarter.writeConfigFile();
            console.log("writeConfigFile()", result);
            setCommandResult("\""+result+"\"");
            setError("{}");
          }
          catch (e) {
            setError(e);
            setCommandResult("{}");
          }
        }}>
          <Text>writeConfigFile()</Text>
        </Button>
        <Button onPress={async () => {
          try {
            const result = await NativeModules.LndProcessStarter.startProcess();
            console.log("startProcess()", result);
            setCommandResult(result);
            setError("");
          }
          catch (e) {
            setError(e);
            setCommandResult("{}");
          }
        }}>
          <Text>startProcess()</Text>
        </Button>
        <Button onPress={async () => {
          try {
            const result = await NativeModules.LndProcessStarter.stopProcess();
            console.log("stopProcess()", result);
            setCommandResult(result);
            setError("");
          }
          catch (e) {
            setError(e);
            setCommandResult("{}");
          }
        }}>
          <Text>stopProcess()</Text>
        </Button>
        <Button onPress={async () => {
          try {
            const result = await NativeModules.LndGrpc.readCertificate();
            console.log("readCertificate()", result);
            setCommandResult(result);
            setError("");
          }
          catch (e) {
            setError(e);
            setCommandResult("{}");
          }
        }}>
          <Text>readCertificate()</Text>
        </Button>
        <Button onPress={async () => {
          try {
            const result = await NativeModules.LndGrpc.readMacaroon();
            console.log("readMacaroon()", result);
            setCommandResult(result);
            setError("");
          }
          catch (e) {
            setError(e);
            setCommandResult("{}");
          }
        }}>
          <Text>readMacaroon()</Text>
        </Button>
        <Button onPress={async () => {
          try {
            const result = await NativeModules.LndGrpc.getInfo();
            console.log("getInfo()", result);
            setCommandResult(result);
            setError("");
            console.log(JSON.parse(result));
            Toast.show({
              text: JSON.parse(result).syncedToChain_.toString(),
              type: "success",
              duration: 250,
            });

          }
          catch (e) {
            setError(e);
            setCommandResult("{}");
          }
        }}>
          <Text>getInfo()</Text>
        </Button>
        <Button onPress={async () => {
          try {
            const result = await NativeModules.LndGrpc.initWallet("test1234");
            console.log("initWallet()", result);
            setCommandResult(result);
            setError("");
          }
          catch (e) {
            setError(e);
            setCommandResult("{}");
          }
        }}>
          <Text>initWallet()</Text>
        </Button>
        <Button onPress={async () => {
          try {
            const result = await NativeModules.LndGrpc.unlockWallet("test1234");
            console.log("unlockWallet()", result);
            setCommandResult(result);
            setError("");
          }
          catch (e) {
            setError(e);
            setCommandResult("{}");
          }
        }}>
          <Text>unlockWallet()</Text>
        </Button>
        <Button onPress={async () => {
          try {
            const result = await NativeModules.LndGrpc.stopDaemon();
            console.log("stopDaemon()", result);
            setCommandResult(result);
            setError("");
          }
          catch (e) {
            setError(e);
            setCommandResult("{}");
          }
        }}>
          <Text>stopDaemon()</Text>
        </Button>
        <Button onPress={async () => {
          try {
            const result = await NativeModules.LndGrpc.newAddress();
            console.log("newAddress()", result);
            setCommandResult(result);
            setError("");
          }
          catch (e) {
            setError(e);
            setCommandResult("{}");
          }
        }}>
          <Text>newAddress()</Text>
        </Button>
        <Button onPress={async () => {
          try {
            const result = await NativeModules.LndGrpc.walletBalance();
            console.log("walletBalance()", result);
            setCommandResult(result);
            setError("");
          }
          catch (e) {
            setError(e);
            setCommandResult("{}");
          }
        }}>
          <Text>walletBalance()</Text>
        </Button>
        <Button onPress={async () => {
          try {
            const result = await NativeModules.LndGrpc.listChannels();
            console.log("listChannels()", result);
            setCommandResult(result);
            setError("");
          }
          catch (e) {
            setError(e);
            setCommandResult("{}");
          }
        }}>
          <Text>listChannels()</Text>
        </Button>
      </View>

      <Input
        onChangeText={(text: string) => {
          setConnectPeer(text);
        }}
        placeholder="<pubkey>@><host>"
        value={connectPeer}
      />
      <Button onPress={async () => {
        try {
          const [pubkey, host] = connectPeer.split("@");

          const result = await NativeModules.LndGrpc.connectPeer(pubkey, host);
          console.log("connectPeer()", result);
          setCommandResult(result);
          setError("");
        }
        catch (e) {
          setError(e);
          setCommandResult("{}");
        }
      }}>
        <Text>connectPeer()</Text>
      </Button>

      <Input
        onChangeText={(text) => {
          setSat(text);
        }}
        placeholder="Satoshi"
        keyboardType="numeric"
        value={sat}
      />
      <Button onPress={async () => {
        try {
          const [pubkey] = connectPeer.split("@");

          const result = await NativeModules.LndGrpc.openChannel(pubkey, Number.parseInt(sat, 10));
          console.log("openChannel()", result);
          setCommandResult(result);
          setError("");
        }
        catch (e) {
          setError(e);
          setCommandResult("{}");
        }
      }}>
        <Text>openChannel()</Text>
      </Button>

      <Input
        onChangeText={(text: string) => {
          setAddr(text);
        }}
        placeholder="Address"
        value={addr}
      />
      <Button onPress={async () => {
        try {
          const result = await NativeModules.LndGrpc.sendCoins(addr);
          console.log("sendCoins()", result);
          setCommandResult(result);
          setError("");
        }
        catch (e) {
          setError(e);
          setCommandResult("{}");
        }
      }}>
        <Text>sendCoins()</Text>
      </Button>

      <Input
        onChangeText={(text: string) => {
          setTx(text);
        }}
        placeholder="tx"
        value={tx}
      />
      <Button onPress={async () => {
        try {
          const [transaction, output] = tx.split(":");
          const result = await NativeModules.LndGrpc.closeChannelVoid(transaction, Number.parseInt(output, 10));
          console.log("closeChannelVoid()", result);
          setCommandResult(result);
          setError("");
        }
        catch (e) {
          setError(e);
          setCommandResult("{}");
        }
      }}>
        <Text>closeChannelVoid()</Text>
      </Button>
      <Button onPress={async () => {
        try {
          const [transaction, output] = tx.split(":");
          const result = await NativeModules.LndGrpc.closeChannel(transaction, Number.parseInt(output, 10));
          console.log("closeChannel()", result);
          setCommandResult(result);
          setError("");
        }
        catch (e) {
          setError(e);
          setCommandResult("{}");
        }
      }}>
        <Text>closeChannel()</Text>
      </Button>

      <Text>{(new Date()).toISOString()}:</Text>
      <Text selectable={true} onPress={() => {
        Clipboard.setString(commandResult);
        Toast.show({
          text: "Copied to clipboard.",
          type: "success",
        });
      }}>{JSON.stringify(JSON.parse(commandResult), null, 2)}</Text>
      <Text>{(new Date()).toISOString()} error:</Text>
      <Text selectable={true} onPress={() => {
        Clipboard.setString(commandResult);
        Toast.show({
          text: "Copied to clipboard.",
          type: "success",
        });
      }}>{error.toString()}</Text>
    </ScrollView>
    </Root>
  );
};

const styles = StyleSheet.create({
  content: {
    padding: 2,
  },
});

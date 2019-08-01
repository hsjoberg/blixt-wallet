import React, { useEffect, useState } from "react";
import { AppState, StyleSheet, StatusBar, DeviceEventEmitter, NativeModules, ScrollView, Clipboard } from "react-native";
import { Content, Text, Button, Toast, Root, Input, View, Container } from "native-base";
import { NavigationScreenProp } from "react-navigation";

import { getTransactions, getTransaction, createTransaction } from "./storage/database/transaction";
import { useStoreState, useStoreActions } from "./state/store";
import { lnrpc } from "../proto/proto";
import { sendCommand } from "./lndmobile/utils";
import { getInfo, newAddress, pendingChannels, listChannels, connectPeer, openChannel, sendCoins, closeChannel } from "./lndmobile";
import { initWallet, genSeed } from "./lndmobile/wallet";

interface IProps {
  navigation: NavigationScreenProp<{}>;
}
export default ({ navigation }: IProps) => {
  const [connectPeerStr, setConnectPeer] = useState("");
  const [sat, setSat] = useState("");
  const [addr, setAddr] = useState("");
  const [tx, setTx] = useState("");
  const [commandResult, setCommandResult] = useState({});
  const [error, setError] = useState({});
  const actions = useStoreActions((store) => store);
  const db = useStoreState((store) => store.db);

  return (
    <Root>
      <Container>
        <StatusBar
          backgroundColor="transparent"
          hidden={false}
          translucent={true}
          networkActivityIndicatorVisible={true}
          barStyle="light-content"
        />
        <ScrollView contentContainerStyle={styles.content}>
          <View style={{ marginTop: 32, width: "100%", display: "flex", flexDirection: "row", flexWrap: "wrap" }}>
            <Button onPress={async () => actions.clearApp()}><Text>actions.clearApp()</Text></Button>
            <Button onPress={async () => actions.resetDb()}><Text>actions.resetDb()</Text></Button>
            <Button onPress={async () => actions.clearTransactions()}><Text>actions.clearTransactions()</Text></Button>
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
            <Button onPress={async () => {
              await Promise.all([
                createTransaction(db!, {
                  date: 1546300800 + Math.floor(Math.random() * 1000),
                  description: "Donation Tor Foundation",
                  remotePubkey: "02ad5e3811fb075e69fe2f038fcc1ece7dfb47150a3b20698f3e9845ef6b6283b6",
                  expire: 1577836800 + Math.floor(Math.random() * 1000),
                  status: "SETTLED",
                  value: -1 * Math.floor(Math.random() * 10000),
                  valueMsat: 1000,
                  fee: Math.floor(Math.random() * 5),
                  feeMsat: Math.floor(Math.random() * 5) * 1000,
                  paymentRequest: "abcdef123456",
                  rHash: Math.floor(Math.random() * 10000000).toString(),
                }),

                createTransaction(db!, {
                  date: 1546300800 + Math.floor(Math.random() * 1000),
                  description: "Dinner",
                  remotePubkey: "02ad5e3811fb075e69fe2f038fcc1ece7dfb47150a3b20698f3e9845ef6b6283b6",
                  expire: 1577836800 + Math.floor(Math.random() * 1000),
                  status: "SETTLED",
                  value:  Math.floor(Math.random() * 10000),
                  valueMsat: 1000,
                  paymentRequest: "abcdef123456",
                  rHash: Math.floor(Math.random() * 10000000).toString(),
                }),

                createTransaction(db!, {
                  date: 1546300800 + Math.floor(Math.random() * 1000),
                  description: "1 Satoccinamon Dolce Latte",
                  remotePubkey: "02ad5e3811fb075e69fe2f038fcc1ece7dfb47150a3b20698f3e9845ef6b6283b6",
                  expire: 1577836800 + Math.floor(Math.random() * 1000),
                  status: "SETTLED",
                  value: -1 * Math.floor(Math.random() * 10000),
                  valueMsat: 1000,
                  fee: Math.floor(Math.random() * 5),
                  feeMsat: Math.floor(Math.random() * 5) * 1000,
                  paymentRequest: "abcdef123456",
                  rHash: Math.floor(Math.random() * 10000000).toString(),
                }),

                createTransaction(db!, {
                  date: 1546300800 + Math.floor(Math.random() * 1000),
                  description: "Webhallen Payment receipt #1a5f1",
                  remotePubkey: "02ad5e3811fb075e69fe2f038fcc1ece7dfb47150a3b20698f3e9845ef6b6283b6",
                  expire: 1577836800 + Math.floor(Math.random() * 1000),
                  status: "SETTLED",
                  value:  -1 * Math.floor(Math.random() * 10000),
                  valueMsat: 1000,
                  fee: Math.floor(Math.random() * 5),
                  feeMsat: Math.floor(Math.random() * 5) * 1000,
                  paymentRequest: "abcdef123456",
                  rHash: Math.floor(Math.random() * 10000000).toString(),
                }),

                createTransaction(db!, {
                  date: 1546300800 + Math.floor(Math.random() * 1000),
                  description: "Mat",
                  remotePubkey: "02ad5e3811fb075e69fe2f038fcc1ece7dfb47150a3b20698f3e9845ef6b6283b6",
                  expire: 1577836800 + Math.floor(Math.random() * 1000),
                  status: "SETTLED",
                  value:  Math.floor(Math.random() * 10000),
                  valueMsat: 1000,
                  paymentRequest: "abcdef123456",
                  rHash: Math.floor(Math.random() * 10000000).toString(),
                }),

                createTransaction(db!, {
                  date: 1546300800 + Math.floor(Math.random() * 1000),
                  description: "Inet payment a34c45af04d",
                  remotePubkey: "02ad5e3811fb075e69fe2f038fcc1ece7dfb47150a3b20698f3e9845ef6b6283b6",
                  expire: 1577836800 + Math.floor(Math.random() * 1000),
                  status: "SETTLED",
                  value:  -1 * Math.floor(Math.random() * 10000),
                  valueMsat: 1000,
                  fee: Math.floor(Math.random() * 5),
                  feeMsat: Math.floor(Math.random() * 5) * 1000,
                  paymentRequest: "abcdef123456",
                  rHash: Math.floor(Math.random() * 10000000).toString(),
                }),

                createTransaction(db!, {
                  date: 1546300800 + Math.floor(Math.random() * 1000),
                  description: "Lunch",
                  remotePubkey: "02ad5e3811fb075e69fe2f038fcc1ece7dfb47150a3b20698f3e9845ef6b6283b6",
                  expire: 1577836800 + Math.floor(Math.random() * 1000),
                  status: "SETTLED",
                  value: Math.floor(Math.random() * 10000),
                  valueMsat: 1000,
                  paymentRequest: "abcdef123456",
                  rHash: Math.floor(Math.random() * 10000000).toString(),
                }),

                createTransaction(db!, {
                  date: 1546300800 + Math.floor(Math.random() * 1000),
                  description: "Lunch",
                  remotePubkey: "02ad5e3811fb075e69fe2f038fcc1ece7dfb47150a3b20698f3e9845ef6b6283b6",
                  expire: 1577836800 + Math.floor(Math.random() * 1000),
                  status: "SETTLED",
                  value: Math.floor(Math.random() * 10000),
                  valueMsat: 1000,
                  paymentRequest: "abcdef123456",
                  rHash: Math.floor(Math.random() * 10000000).toString(),
                }),

                createTransaction(db!, {
                  date: 1546300800 + Math.floor(Math.random() * 1000),
                  description: "Webhallen Payment receipt #6b5aa",
                  remotePubkey: "02ad5e3811fb075e69fe2f038fcc1ece7dfb47150a3b20698f3e9845ef6b6283b6",
                  expire: 1577836800 + Math.floor(Math.random() * 1000),
                  status: "SETTLED",
                  value:  -1 * Math.floor(Math.random() * 10000),
                  valueMsat: 1000,
                  fee: Math.floor(Math.random() * 5),
                  feeMsat: Math.floor(Math.random() * 5) * 1000,
                  paymentRequest: "abcdef123456",
                  rHash: Math.floor(Math.random() * 10000000).toString(),
                }),

                createTransaction(db!, {
                  date: 1546300800 + Math.floor(Math.random() * 1000),
                  description: "Lunch",
                  remotePubkey: "02ad5e3811fb075e69fe2f038fcc1ece7dfb47150a3b20698f3e9845ef6b6283b6",
                  expire: 1577836800 + Math.floor(Math.random() * 1000),
                  status: "SETTLED",
                  value: Math.floor(Math.random() * 10000),
                  valueMsat: 1000,
                  paymentRequest: "abcdef123456",
                  rHash: Math.floor(Math.random() * 10000000).toString(),
                }),
              ]);

            }}><Text>Create demo transactions</Text></Button>
            <Button onPress={async () => console.log(await getTransactions(db!))}><Text>getTransactions()</Text></Button>
            <Button onPress={async () => console.log(await getTransaction(db!, 1))}><Text>getTransaction(1)</Text></Button>
            <Button onPress={async () => await NativeModules.LndMobile.init()}><Text>LndMobile.init()</Text></Button>
            <Button onPress={async () => navigation.navigate("Init")}><Text>navigation.navigate("Init")</Text></Button>
            <Button onPress={async () => navigation.navigate("Overview")}><Text>navigation.navigate("Overview")</Text></Button>
            <Button onPress={async () => navigation.navigate("InitLightning")}><Text>navigation.navigate("InitLightning")</Text></Button>
            <Button onPress={async () => navigation.navigate("Welcome")}><Text>navigation.navigate("Welcome")</Text></Button>
            <Button onPress={async () => {
              try {
                const result = await NativeModules.LndMobile.writeConfigFile();
                console.log("writeConfigFile()", result);
                setCommandResult(`"${result}"`);
                setError("{}");
              }
              catch (e) {
                setError(e);
                setCommandResult({});
              }
            }}>
              <Text>writeConfigFile()</Text>
            </Button>

            {[getInfo, genSeed, newAddress, pendingChannels, listChannels].map((f, i) => {
              return (
                <Button key={i} onPress={async () => {
                  try {
                      const response = await f();
                      console.log(`${f.name}()`, response.toJSON());
                      setCommandResult(response.toJSON());
                    }
                    catch (e) {
                      setError(e);
                      setCommandResult({});
                    }
                  }}>
                    <Text>{f.name}()</Text>
                </Button>
              );
            })}

            <Button onPress={async () => {
              try {
                const response = await sendCommand<lnrpc.IStopRequest, lnrpc.StopRequest, lnrpc.StopResponse>({
                  request: lnrpc.StopRequest,
                  response: lnrpc.StopResponse,
                  method: "StopDaemon",
                  options: {},
                });
                console.log("stopDaemon()", response.toJSON());
                setCommandResult(response.toJSON());
                setError({});
              }
              catch (e) {
                setError(e);
                setCommandResult({});
              }
            }}>
              <Text>stopDaemon()</Text>
            </Button>
            <Button onPress={async () => {
              try {
                const response = await initWallet(
                  ["absent", "path", "oyster", "net", "pig", "photo", "test", "magic", "inmate", "chair", "wash", "roast", "donor", "glow", "decline", "venue", "observe", "flavor", "ahead", "suit", "easily", "excite", "entire", "scheme"],
                  "test1234"
                );
                console.log("initWallet()", response.toJSON());
                setCommandResult(response.toJSON());
                setError({});
              }
              catch (e) {
                setError(e);
                setCommandResult({});
              }
            }}>
              <Text>initWallet()</Text>
            </Button>
            <Button onPress={async () => {
              try {
                const response = await sendCommand<lnrpc.IWalletBalanceRequest, lnrpc.WalletBalanceRequest, lnrpc.WalletBalanceResponse>({
                  request: lnrpc.WalletBalanceRequest,
                  response: lnrpc.WalletBalanceResponse,
                  method: "WalletBalance",
                  options: {}, // TODO why is totalBalance a option property?
                });
                console.log("totalBalance", response.totalBalance);
                console.log("unconfirmedBalance", response.unconfirmedBalance);
                console.log("confirmedBalance", response.confirmedBalance);
                console.log("walletBalance()", response);
                console.log("walletBalance() toJSON", response.toJSON());
                setCommandResult(response.toJSON());
                setError({});
              }
              catch (e) {
                setError(e);
                setCommandResult({});
              }
            }}>
              <Text>walletBalance()</Text>
            </Button>
          </View>

          <Input
            onChangeText={(text: string) => {
              setConnectPeer(text);
            }}
            placeholder="<pubkey>@><host>"
            value={connectPeerStr}
          />
          <Button onPress={async () => {
            try {
              const [pubkey, host] = connectPeerStr.split("@");

              const result = await connectPeer(pubkey, host);
              console.log("connectPeer()", result);
              setCommandResult(result);
              setError({});
            }
            catch (e) {
              setError(e);
              setCommandResult({});
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
              const [pubkey] = connectPeerStr.split("@");

              const result = await openChannel(pubkey, Number.parseInt(sat, 10));
              console.log("openChannel()", result);
              setCommandResult(result);
              setError({});
            }
            catch (e) {
              setError(e);
              setCommandResult({});
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
              const result = await sendCoins(addr, Number.parseInt(sat, 10));
              console.log("sendCoins()", result);
              setCommandResult(result);
              setError({});
            }
            catch (e) {
              setError(e);
              setCommandResult({});
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
              const result = await closeChannel(transaction, Number.parseInt(output, 10));
              console.log("closeChannel()", result);
              setCommandResult(result);
              setError({});
            }
            catch (e) {
              setError(e);
              setCommandResult({});
            }
          }}>
            <Text>closeChannel()</Text>
          </Button>

          <Text>{(new Date()).toISOString()}:</Text>
          <Text selectable={true} onPress={() => {
            Clipboard.setString(JSON.stringify(commandResult));
            Toast.show({
              text: "Copied to clipboard.",
              type: "success",
            });
          }}>{JSON.stringify(commandResult, null, 2)}</Text>

          <Text>{(new Date()).toISOString()} error:</Text>
          <Text selectable={true} onPress={() => {
            Clipboard.setString(JSON.stringify(commandResult));
            Toast.show({
              text: "Copied to clipboard.",
              type: "success",
            });
          }}>{JSON.stringify(error)}</Text>
        </ScrollView>
      </Container>
    </Root>
  );
};

const styles = StyleSheet.create({
  content: {
    padding: 2,
  },
});

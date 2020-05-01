import React, { useState } from "react";
import { StyleSheet, StatusBar, NativeModules, ScrollView } from "react-native";
import Clipboard from "@react-native-community/react-native-clipboard";
import { Text, Button, Toast, Input, View, Container } from "native-base";
import Long from "long";
import { StackNavigationProp } from "@react-navigation/stack";

import { getTransactions, getTransaction, createTransaction } from "../../storage/database/transaction";
import { useStoreState, useStoreActions } from "../../state/store";
import { lnrpc } from "../../../proto/proto";
import { sendCommand } from "../../lndmobile/utils";
import { getInfo, connectPeer, listPeers } from "../../lndmobile/index";
import { initWallet, genSeed } from "../../lndmobile/wallet";
import { pendingChannels, listChannels, openChannel, closeChannel } from "../../lndmobile/channel";
import { newAddress, sendCoins } from "../../lndmobile/onchain";
import { StorageItem, setItemObject, getItem } from "../../storage/app";
import { status, modifyStatus, queryScores } from "../../lndmobile/autopilot";
import { localNotification } from "../../utils/push-notification";
import { RootStackParamList } from "../../Main";
import { setWalletPassword, getWalletPassword } from "../../storage/keystore";
import Content from "../../components/Content";
import { blixtTheme } from "../../../native-base-theme/variables/commonColor";

interface IProps {
  navigation?: StackNavigationProp<RootStackParamList, "DEV_Commands">;
  continueCallback?: () => void;
}
export function DEV_Commands({ navigation, continueCallback }: IProps) {
  const [connectPeerStr, setConnectPeer] = useState("");
  const [sat, setSat] = useState("");
  const [addr, setAddr] = useState("");
  const [tx, setTx] = useState("");
  const [commandResult, setCommandResult] = useState({});
  const [error, setError] = useState({});
  const actions = useStoreActions((store) => store);
  const db = useStoreState((store) => store.db);

  const TransactionStoreGetTransactions = useStoreActions((store) => store.transaction.getTransactions);

  continueCallback = continueCallback ?? function() {};

  return (
    <Container>
      <StatusBar
        backgroundColor="transparent"
        hidden={false}
        translucent={true}
        networkActivityIndicatorVisible={true}
        barStyle="light-content"
      />
      <Content style={styles.content}>
        <View style={{ backgroundColor: blixtTheme.dark, marginTop: 32, width: "100%", display: "flex", flexDirection: "row", flexWrap: "wrap" }}>
          <Button onPress={continueCallback}><Text>continueCallback()</Text></Button>
          <Button onPress={async () => actions.clearApp()}><Text>actions.clearApp()</Text></Button>
          <Button onPress={async () => actions.resetDb()}><Text>actions.resetDb()</Text></Button>
          <Button onPress={async () => { localNotification("Test"); }}><Text>localNotification()</Text></Button>
          <Button onPress={async () => actions.clearTransactions()}><Text>actions.clearTransactions()</Text></Button>
          <Button onPress={async () => await setItemObject(StorageItem.walletCreated, true)}><Text>walletCreated = true</Text></Button>
          <Button onPress={async () => await setItemObject(StorageItem.loginMethods, ["pincode"])}><Text>set logginMethods to ["pincode"]</Text></Button>
          <Button onPress={async () => await setItemObject(StorageItem.loginMethods, [])}><Text>set logginMethods to []</Text></Button>
          <Button onPress={async () => await setItemObject(StorageItem.bitcoinUnit, "bitcoin")}><Text>set bitcoinUnit to bitcoin</Text></Button>
          <Button onPress={async () => await setItemObject(StorageItem.walletCreated, true)}><Text>walletCreated = true</Text></Button>
          <Button onPress={async () => await setItemObject(StorageItem.appVersion, 0)}><Text>appVersion = 0</Text></Button>
          <Button onPress={async () => console.log(await NativeModules.LndMobile.DEBUG_deleteWallet())}><Text>DEBUG_deleteWallet</Text></Button>
          <Button onPress={async () => console.log(await NativeModules.LndMobile.DEBUG_deleteDatafolder())}><Text>DEBUG_deleteDatafolder</Text></Button>
          <Button onPress={async () => await actions.initializeApp()}><Text>actions.initializeApp()</Text></Button>

          {/* <Button onPress={async () => console.log(await getWalletPassword())}><Text>getWalletPassword()</Text></Button>
          <Button onPress={async () => console.log(await setWalletPassword("test123"))}><Text>setWalletPassword()</Text></Button> */}
          <Button onPress={async () => console.log(await NativeModules.LndMobile.DEBUG_getWalletPasswordFromKeychain())}><Text>LndMobile.DEBUG_getWalletPasswordFromKeychain()</Text></Button>

          <Button onPress={async () => console.log(await NativeModules.LndMobileScheduledSync.setupScheduledSyncWork())}><Text>setupScheduledSyncWork</Text></Button>
          <Button onPress={async () => console.log(await NativeModules.LndMobileScheduledSync.removeScheduledSyncWork())}><Text>removeScheduledSyncWork</Text></Button>
          <Button onPress={async () => console.log(await NativeModules.LndMobileScheduledSync.checkScheduledSyncWorkStatus())}><Text>checkScheduledSyncWorkStatus</Text></Button>
          <Button onPress={async () => console.log(await NativeModules.LndMobile.saveLogs())}><Text>saveLogs</Text></Button>

          <Button onPress={async () => console.log(await createTransaction(db!, {
            date: Math.floor(+new Date()/1000) + Math.floor(Math.random() * 1000), // 2019-01-01 00:00:00
            description: "Alice:  Lunch Phil's Burger",
            remotePubkey: "02ad5e3811fb075e69fe2f038fcc1ece7dfb47150a3b20698f3e9845ef6b6283b6",
            expire: Math.floor(+new Date()/1000) + Math.floor(1000 + (Math.random() * 1000)), // 2020-01-01 00:00:00
            status: "SETTLED",
            value:  -1 * Math.floor(Math.random() * 10000),
            valueMsat: 1000,
            amtPaidSat:  -1 * Math.floor(Math.random() * 10000),
            amtPaidMsat:  1000,
            paymentRequest: "abcdef123456",
            rHash: "abcdef123456",
          }))}><Text>createTransaction()</Text></Button>
          <Button onPress={async () => {
            interface IDemoInvoice {
              description: string;
              value: number;
              type: "PAY" | "RECEIVE";
              payer?: string;
            }
            const createDemoTransactions = async (invoices: IDemoInvoice[]) => {
              await Promise.all(
                invoices.map(async (invoice) => {
                  const value = invoice.value + (((invoice.type == "PAY" ? -1 : 1) * Math.floor(Math.random() * 500))) + Math.floor(Math.random() * 1000);
                  return createTransaction(db!, {
                    date: Long.fromNumber(1546300800 + Math.floor(Math.random() * 1000000)),
                    description: invoice.description,
                    remotePubkey: "02ad5e3811fb075e69fe2f038fcc1ece7dfb47150a3b20698f3e9845ef6b6283b6",
                    expire: Long.fromNumber(1577836800 + Math.floor(Math.random() * 1000)),
                    status: "SETTLED",
                    value: Long.fromNumber((invoice.type == "PAY" ? -1 : 1) * value),
                    valueMsat: Long.fromNumber((invoice.type == "PAY" ? -1 : 1) * value * 1000),
                    amtPaidSat: Long.fromNumber((invoice.type == "PAY" ? -1 : 1) * 0),
                    amtPaidMsat: Long.fromNumber((invoice.type == "PAY" ? -1 : 1) * 0),
                    valueUSD: (invoice.type == "PAY" ? -1 : 1) * 100,
                    valueFiat: (invoice.type == "PAY" ? -1 : 1) * 100,
                    valueFiatCurrency : "SEK",
                    fee: Long.fromNumber(Math.floor(Math.random() * 5)),
                    feeMsat: Long.fromNumber(Math.floor(Math.random() * 5) * 1000),
                    paymentRequest: "abcdef123456",
                    rHash: Math.floor(Math.random() * 10000000).toString(),
                    nodeAliasCached: null,
                    payer: invoice.payer,
                    hops: [],
                  });
                })
              );
            };

            await createDemoTransactions([{
              value: 100000,
              description: "Tor Foundation:  Donation",
              type: "PAY",
            }, {
              value: 10000,
              description: "Dinner",
              payer: "John",
              type: "RECEIVE",
            }, {
              value: 1000000,
              description: "Alpaca socks:  Receipt #1a5f1",
              type: "PAY",
            }, {
              value: 50000,
              description: "Lunch",
              payer: "Sarah",
              type: "RECEIVE",
            }, {
              value: 200000,
              description: "Computer store:  Payment a34c45af04d",
              type: "PAY",
            }, {
              value: 100000,
              description: "Bitcoin Core:  Donation",
              type: "PAY",
            }]);
          }}><Text>Create demo transactions</Text></Button>
          <Button onPress={async () => console.log(await TransactionStoreGetTransactions())}><Text>Transaction store: getTransactions()</Text></Button>
          <Button onPress={async () => console.log(await getTransactions(db!))}><Text>getTransactions()</Text></Button>
          <Button onPress={async () => console.log(await getTransaction(db!, 1))}><Text>getTransaction(1)</Text></Button>
          <Button onPress={async () => await NativeModules.LndMobile.init()}><Text>LndMobile.init()</Text></Button>
          <Button onPress={async () => await NativeModules.LndMobile.startLnd()}><Text>LndMobile.startLnd()</Text></Button>
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

          {[getInfo, genSeed, newAddress, pendingChannels, listChannels, listPeers].map((f, i) => {
            return (
              <Button key={i} onPress={async () => {
                try {
                    const response = await f();
                    console.log(`${f.name}()`, response.toJSON());
                    setCommandResult(response.toJSON());
                    setError({});
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
              const response = await status();
              console.log(response);
              console.log(response.active);
              setCommandResult(response.toJSON());
              setError({});
            }
            catch (e) {
              setError(e);
              setCommandResult({});
            }
          }}><Text>status</Text></Button>

          <Button onPress={async () => {
            try {
              const response = await modifyStatus(true);
              console.log(response);
              setCommandResult(response.toJSON());
              setError({});
            }
            catch (e) {
              setError(e);
              setCommandResult({});
            }
          }}><Text>modifyStatus(true)</Text></Button>

          <Button onPress={async () => {
            try {
              const response = await queryScores();
              console.log(response);
              console.log("0", response.results[0].scores);
              console.log("1", response.results[1].scores);
              console.log("2", response.results[2].scores);
              setCommandResult(response.toJSON());
              setError({});
            }
            catch (e) {
              setError(e);
              setCommandResult({});
            }
          }}><Text>queryScores</Text></Button>

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
        <View style={{ backgroundColor: blixtTheme.dark, marginTop: 32, width: "100%", display: "flex", flexDirection: "column", flexWrap: "wrap" }}>
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
        </View>
      </Content>
    </Container>
  );
};

const styles = StyleSheet.create({
  content: {
    padding: 2,
  },
});



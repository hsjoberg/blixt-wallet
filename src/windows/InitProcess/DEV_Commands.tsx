import React, { useState } from "react";
import { StyleSheet, StatusBar, NativeModules, ScrollView, DeviceEventEmitter } from "react-native";
import Clipboard from "@react-native-community/react-native-clipboard";
import { Text, Button, Toast, Input, View, Container } from "native-base";
import Long from "long";
import { StackNavigationProp } from "@react-navigation/stack";
import * as base64 from "base64-js";
import * as Keychain from 'react-native-keychain';

import Sound from "react-native-sound";

import { getTransactions, getTransaction, createTransaction, clearTransactions } from "../../storage/database/transaction";
import { useStoreState, useStoreActions } from "../../state/store";
import { lnrpc } from "../../../proto/proto";
import { sendCommand } from "../../lndmobile/utils";
import { getInfo, connectPeer, listPeers } from "../../lndmobile/index";
import { initWallet, genSeed, deriveKey } from "../../lndmobile/wallet";
import { pendingChannels, listChannels, openChannel, closeChannel } from "../../lndmobile/channel";
import { newAddress, sendCoins } from "../../lndmobile/onchain";
import { storage, StorageItem, setItemObject, getItem, setItem } from "../../storage/app";
import { status, modifyStatus, queryScores } from "../../lndmobile/autopilot";
import { RootStackParamList } from "../../Main";
import { setWalletPassword, getWalletPassword, getItemObject } from "../../storage/keystore";
import Content from "../../components/Content";
import { blixtTheme } from "../../../native-base-theme/variables/commonColor";
import { LoginMethods } from "../../state/Security";
import Spinner from "../../components/Spinner";


interface IProps {
  navigation?: StackNavigationProp<RootStackParamList, "DEV_Commands">;
  continueCallback?: () => void;
}
export default function DEV_Commands({ navigation, continueCallback }: IProps) {
  const [connectPeerStr, setConnectPeer] = useState("");
  const [sat, setSat] = useState("");
  const [addr, setAddr] = useState("");
  const [tx, setTx] = useState("");
  const [commandResult, setCommandResult] = useState({});
  const [error, setError] = useState({});
  const actions = useStoreActions((store) => store);
  const db = useStoreState((store) => store.db);

  const TransactionStoreGetTransactions = useStoreActions((store) => store.transaction.getTransactions);

  continueCallback = continueCallback ?? function () { };

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

          <Button onPress={continueCallback}><Text style={styles.buttonText}>continueCallback()</Text></Button>

          <Text style={{ width: "100%"}}>Random:</Text>
          <Button small onPress={() => {
            Toast.show({
              text: "Copied to clipboard.",
              type: "success",
            });
          }}>
            <Text style={styles.buttonText}>Toast</Text>
          </Button>
          <Button small onPress={() => {
            const whoosh = new Sound('success.wav', Sound.MAIN_BUNDLE, (error) => {
              if (error) {
                console.log('failed to load the sound', error);
                return;
              }
              // loaded successfully
              console.log('duration in seconds: ' + whoosh.getDuration() + 'number of channels: ' + whoosh.getNumberOfChannels());

              // Play the sound with an onEnd callback
              whoosh.play((success) => {
                if (success) {
                  console.log('successfully finished playing');
                } else {
                  console.log('playback failed due to audio decoding errors');
                }
              });
            });
          }}>
            <Text style={styles.buttonText}>Play success sound</Text>
          </Button>
          <Button small onPress={async () => {
            const subscribeInvoicesUpdate = lnrpc.Invoice.create({
              amtPaid: Long.fromValue(1000),
              amtPaidMsat: Long.fromValue(1000 * 1000),
              rHash: new Uint8Array([0, 1, 2, 3]),
            });

            DeviceEventEmitter.emit(
              "SubscribeInvoices",
              { data: base64.fromByteArray(lnrpc.InvoiceSubscription.encode(subscribeInvoicesUpdate).finish()) }
            );
          }}><Text style={styles.buttonText}>Emit fake transaction</Text></Button>

          <Text style={{ width: "100%" }}>Security:</Text>
          <Button small onPress={async () => {
            await setItemObject(StorageItem.loginMethods, []);
          }}><Text style={styles.buttonText}>set loginMethods to []</Text></Button>
          <Button small onPress={async () => {
            console.log(await getWalletPassword());
          }}><Text style={styles.buttonText}>getGenericPassword</Text></Button>
          <Button small onPress={async () => console.log(await getWalletPassword())}><Text style={styles.buttonText}>getWalletPassword()</Text></Button>

          {/* <Text style={{ width: "100%" }}>Dangerous:</Text>
          <Button small onPress={async () => actions.clearApp()}><Text style={styles.buttonText}>actions.clearApp()</Text></Button>
          <Button small onPress={async () => console.log(await NativeModules.LndMobile.DEBUG_deleteWallet())}><Text style={styles.buttonText}>DEBUG_deleteWallet</Text></Button>
          <Button small onPress={async () => console.log(await NativeModules.LndMobile.DEBUG_deleteDatafolder())}><Text style={styles.buttonText}>DEBUG_deleteDatafolder</Text></Button> */}


          <Text style={{ width:"100%" }}>App storage:</Text>
          <Button small onPress={async () => actions.resetDb()}><Text style={styles.buttonText}>actions.resetDb()</Text></Button>
          <Button small onPress={async () => await setItemObject(StorageItem.walletCreated, true)}><Text style={styles.buttonText}>walletCreated = true</Text></Button>
          <Button small onPress={async () => await setItemObject(StorageItem.loginMethods, ["pincode"])}><Text style={styles.buttonText}>set logginMethods to ["pincode"]</Text></Button>
          <Button small onPress={async () => await setItemObject(StorageItem.loginMethods, [])}><Text style={styles.buttonText}>set logginMethods to []</Text></Button>
          <Button small onPress={async () => await setItemObject(StorageItem.bitcoinUnit, "bitcoin")}><Text style={styles.buttonText}>set bitcoinUnit to bitcoin</Text></Button>
          <Button small onPress={async () => await setItemObject(StorageItem.walletCreated, true)}><Text style={styles.buttonText}>walletCreated = true</Text></Button>
          <Button small onPress={async () => await setItemObject(StorageItem.appVersion, 0)}><Text style={styles.buttonText}>appVersion = 0</Text></Button>
          <Button small onPress={async () => await setItem(StorageItem.onboardingState, "SEND_ONCHAIN")}><Text style={styles.buttonText}>onboardingState = SEND_ONCHAIN</Text></Button>
          <Button small onPress={async () => await setItem(StorageItem.onboardingState, "DO_BACKUP")}><Text style={styles.buttonText}>onboardingState = DO_BACKUP</Text></Button>
          <Button small onPress={async () => await setItem(StorageItem.onboardingState, "DONE")}><Text style={styles.buttonText}>onboardingState = DONE</Text></Button>

          <Text style={{ width: "100%" }}>lndmobile:</Text>
          <Button small onPress={async () => await NativeModules.LndMobile.init()}><Text style={styles.buttonText}>LndMobile.init()</Text></Button>
          <Button small onPress={async () => await NativeModules.LndMobile.startLnd()}><Text style={styles.buttonText}>LndMobile.startLnd()</Text></Button>

          <Button small onPress={async () => await actions.initializeApp()}><Text style={styles.buttonText}>actions.initializeApp()</Text></Button>
          <Button small onPress={async () => {
            try {
              console.log(await NativeModules.LndMobile.DEBUG_getWalletPasswordFromKeychain())
            } catch (e) { console.log(e) }
          }}><Text style={styles.buttonText}>LndMobile.DEBUG_getWalletPasswordFromKeychain()</Text></Button>

          <Button small onPress={async () => console.log(await NativeModules.LndMobileScheduledSync.setupScheduledSyncWork())}><Text style={styles.buttonText}>setupScheduledSyncWork</Text></Button>
          <Button small onPress={async () => console.log(await NativeModules.LndMobileScheduledSync.removeScheduledSyncWork())}><Text style={styles.buttonText}>removeScheduledSyncWork</Text></Button>
          <Button small onPress={async () => console.log(await NativeModules.LndMobileScheduledSync.checkScheduledSyncWorkStatus())}><Text style={styles.buttonText}>checkScheduledSyncWorkStatus</Text></Button>
          <Button small onPress={async () => console.log(await NativeModules.LndMobile.saveLogs())}><Text style={styles.buttonText}>saveLogs</Text></Button>
          <Button small onPress={async () => {
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
            <Text style={styles.buttonText}>writeConfigFile()</Text>
          </Button>

          <Text style={{ width: "100%" }}>Sqlite:</Text>
          <Button small onPress={async () => console.log(await createTransaction(db!, {
            date: Math.floor(+new Date() / 1000) + Math.floor(Math.random() * 1000), // 2019-01-01 00:00:00
            description: "Alice:  Lunch Phil's Burger",
            remotePubkey: "02ad5e3811fb075e69fe2f038fcc1ece7dfb47150a3b20698f3e9845ef6b6283b6",
            expire: Math.floor(+new Date() / 1000) + Math.floor(1000 + (Math.random() * 1000)), // 2020-01-01 00:00:00
            status: "SETTLED",
            value: -1 * Math.floor(Math.random() * 10000),
            valueMsat: 1000,
            amtPaidSat: -1 * Math.floor(Math.random() * 10000),
            amtPaidMsat: 1000,
            paymentRequest: "abcdef123456",
            rHash: "abcdef123456",
            type: "NORMAL"
          }))}><Text style={styles.buttonText}>createTransaction()</Text></Button>
          <Button small onPress={async () => {
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
                    valueFiatCurrency: "SEK",
                    fee: Long.fromNumber(Math.floor(Math.random() * 5)),
                    feeMsat: Long.fromNumber(Math.floor(Math.random() * 5) * 1000),
                    paymentRequest: "abcdef123456",
                    rHash: Math.floor(Math.random() * 10000000).toString(),
                    nodeAliasCached: null,
                    payer: invoice.payer,
                    type: "NORMAL",
                    tlvRecordName: null,
                    locationLat: null,
                    locationLong: null,
                    website: null,
                    hops: [],
                    preimage: new Uint8Array([0,0]),
                    lnurlPayResponse: null,
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
          }}><Text style={styles.buttonText}>Create demo transactions</Text></Button>
          <Button small onPress={async () => console.log(await TransactionStoreGetTransactions())}><Text style={styles.buttonText}>Transaction store: getTransactions()</Text></Button>
          <Button small onPress={async () => console.log(await getTransactions(db!))}><Text style={styles.buttonText}>getTransactions()</Text></Button>
          <Button small onPress={async () => console.log(await getTransaction(db!, 1))}><Text style={styles.buttonText}>getTransaction(1)</Text></Button>
          <Button small onPress={async () => console.log(await clearTransactions(db!))}><Text style={styles.buttonText}>actions.clearTransactions()</Text></Button>

          <Text style={{ width: "100%" }}>Lndmobile commands:</Text>
          {[getInfo, genSeed, newAddress, pendingChannels, listChannels, listPeers].map((f, i) => {
            return (
              <Button small key={i} onPress={async () => {
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
                <Text style={styles.buttonText}>{f.name}()</Text>
              </Button>
            );
          })}

          <Button small onPress={async () => {
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
          }}><Text style={styles.buttonText}>status</Text></Button>

          <Button small onPress={async () => {
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
          }}><Text style={styles.buttonText}>modifyStatus(true)</Text></Button>

          <Button small onPress={async () => {
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
          }}><Text style={styles.buttonText}>queryScores</Text></Button>

          <Button small onPress={async () => {
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
            <Text style={styles.buttonText}>stopDaemon()</Text>
          </Button>
          <Button small onPress={async () => {
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
            <Text style={styles.buttonText}>initWallet()</Text>
          </Button>
          <Button small onPress={async () => {
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
            <Text style={styles.buttonText}>walletBalance()</Text>
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
          <Button small onPress={async () => {
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
            <Text style={styles.buttonText}>connectPeer()</Text>
          </Button>

          <Input
            onChangeText={(text) => {
              setSat(text);
            }}
            placeholder="Satoshi"
            keyboardType="numeric"
            value={sat}
          />
          <Button small onPress={async () => {
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
            <Text style={styles.buttonText}>openChannel()</Text>
          </Button>

          <Input
            onChangeText={(text: string) => {
              setAddr(text);
            }}
            placeholder="Address"
            value={addr}
          />
          <Button small onPress={async () => {
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
            <Text style={styles.buttonText}>sendCoins()</Text>
          </Button>

          <Input
            onChangeText={(text: string) => {
              setTx(text);
            }}
            placeholder="tx"
            value={tx}
          />
          <Button small onPress={async () => {
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
            <Text style={styles.buttonText}>closeChannel()</Text>
          </Button>

          <Text style={styles.buttonText}>{(new Date()).toISOString()}:</Text>
          <Text style={styles.buttonText} selectable={true} onPress={() => {
            Clipboard.setString(JSON.stringify(commandResult));
            Toast.show({
              text: "Copied to clipboard.",
              type: "success",
            });
          }}>{JSON.stringify(commandResult, null, 2)}</Text>

          <Text style={styles.buttonText}>{(new Date()).toISOString()} error:</Text>
          <Text style={styles.buttonText} selectable={true} onPress={() => {
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
  buttonText: {
    fontSize: 12,
  }
});



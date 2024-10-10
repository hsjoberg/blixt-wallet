import { PLATFORM } from "../../utils/constants";
import { Button, Container, Input, Text, Toast, View } from "native-base";
import { CONSTANTS, JSHash } from "react-native-hash";
import { Linking, NativeModules, StatusBar, StyleSheet } from "react-native";
import React, { useState } from "react";
import { StorageItem, setItem, setItemObject } from "../../storage/app";
import { bytesToHexString, hexToUint8Array, stringToUint8Array, toast } from "../../utils";

import {
  clearTransactions,
  createTransaction,
  getTransaction,
  getTransactions,
} from "../../storage/database/transaction";

import { getPin, getWalletPassword } from "../../storage/keystore";

import { useStoreActions, useStoreState } from "../../state/store";

import { Alert } from "../../utils/alert";
import Clipboard from "@react-native-clipboard/clipboard";
import Content from "../../components/Content";
import { ICLOUD_BACKUP_KEY } from "../../state/ICloudBackup";
import { ILightningServices } from "../../utils/lightning-services";
import Long from "long";
import { RootStackParamList } from "../../Main";
import { StackNavigationProp } from "@react-navigation/stack";
import { blixtTheme } from "../../native-base-theme/variables/commonColor";
import { generateSecureRandom, generateSecureRandomAsBase64 } from "../../lndmobile/index";
import { localNotification } from "../../utils/push-notification";

import {
  channelAcceptor,
  connectPeer,
  decodePayReq,
  genSeed,
  getInfo,
  getNetworkInfo,
  getTransactions as listTransactions,
  initWallet,
  invoicesSubscribeSingleInvoice,
  listChannels,
  listInvoices,
  listPeers,
  listUnspent,
  newAddress,
  pendingChannels,
  queryRoutes,
  routerQueryMissionControl,
  routerXImportMissionControl,
  start,
  stopDaemon,
  closedChannels,
  addInvoice,
  autopilotStatus,
  autopilotModifyStatus,
  autopilotQueryScores,
  signMessage,
  walletBalance,
  getRecoveryInfo,
  getNodeInfo,
  openChannelSync,
  sendCoins,
  closeChannel,
  abandonChannel,
} from "react-native-turbo-lnd";

import TurboSqlite from "react-native-turbo-sqlite";

import LndMobileToolsTurbo from "../../turbomodules/NativeLndmobileTools";

let iCloudStorage: any;
console.log(PLATFORM);
if (PLATFORM === "ios") {
  iCloudStorage = require("react-native-icloudstore").default;
}

interface IProps {
  navigation?: StackNavigationProp<RootStackParamList, "DEV_Commands">;
  continueCallback?: () => void;
}
export default function DEV_Commands({ navigation, continueCallback }: IProps) {
  const [channelPoint, setChannelPoint] = useState("");
  const [connectPeerStr, setConnectPeer] = useState("");
  const [sat, setSat] = useState("");
  const [addr, setAddr] = useState("");
  const [tx, setTx] = useState("");
  const [commandResult, setCommandResult] = useState({});
  const [error, setError] = useState({});
  const actions = useStoreActions((store) => store);
  const db = useStoreState((store) => store.db);

  const TransactionStoreGetTransactions = useStoreActions(
    (store) => store.transaction.getTransactions,
  );

  continueCallback = continueCallback ?? function () {};

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
        <View
          style={{
            backgroundColor: blixtTheme.dark,
            marginTop: 32,
            width: "100%",
            display: "flex",
            flexDirection: "row",
            flexWrap: "wrap",
          }}
        >
          {!navigation && (
            <Button success onPress={continueCallback}>
              <Text style={styles.buttonText}>continueCallback()</Text>
            </Button>
          )}
          {navigation && (
            <>
              <Button
                success
                onPress={async () => {
                  navigation?.navigate("Overview");
                }}
              >
                <Text style={styles.buttonText}>navigate to overview</Text>
              </Button>
              <Button
                success
                onPress={async () => {
                  navigation?.navigate("Welcome");
                }}
              >
                <Text style={styles.buttonText}>navigate to onboarding</Text>
              </Button>
            </>
          )}
          {/*
           *
           * TurboSqlite
           *
           */}
          <Text style={{ width: "100%" }}>TurboSqlite:</Text>
          <Button
            small
            onPress={async () => {
              const db = TurboSqlite.openDatabase(
                `/data/user/0/com.blixtwallet.debug/databases/Blixt`,
              );

              console.log(db.executeSql("SELECT * from tx", []));
            }}
          >
            <Text>test</Text>
          </Button>
          <Button small onPress={async () => console.log(TurboSqlite.getVersionString())}>
            <Text>TurboSqlite.getVersionString()</Text>
          </Button>
          {/*
           *
           * TurboLnd
           *
           */}
          <Text style={{ width: "100%" }}>TurboLnd:</Text>
          <Button
            small
            onPress={async () => {
              start(
                `--lnddir="/data/user/0/com.blixtwallet.debug/files/"
                --noseedbackup
                --nolisten
                --bitcoin.active
                --bitcoin.mainnet
                --bitcoin.node=neutrino
                --feeurl="https://nodes.lightning.computer/fees/v1/btc-fee-estimates.json"
                --routing.assumechanvalid
                --tlsdisableautofill
                --db.bolt.auto-compact
                --db.bolt.auto-compact-min-age=0
                --neutrino.connect=192.168.10.120:19444`,
              );
            }}
          >
            <Text style={styles.buttonText}>start</Text>
          </Button>
          <Button
            small
            onPress={async () => {
              console.log(LndMobileToolsTurbo.hello());
            }}
          >
            <Text style={styles.buttonText}>LndMobileToolsTurbo.hello</Text>
          </Button>

          {/*
           *
           * Random
           *
           */}
          <Text style={{ width: "100%" }}>Random:</Text>
          <Button
            small
            onPress={async () => {
              const startTime = performance.now();
              for (let i = 0; i < 10000; i++) {
                // console.log(
                await getInfo({});
                // );
              }
              const endTime = performance.now();
              const executionTime = endTime - startTime;

              console.log("done");
              console.log(`Execution time: ${executionTime} milliseconds`);
              if (!__DEV__) {
                Alert.alert(`Execution time: ${executionTime} milliseconds`);
              }
            }}
          >
            <Text style={styles.buttonText}>getInfo x 100 benchmark</Text>
          </Button>
          <Button
            small
            onPress={async () => {
              console.log(await getInfo({}));
            }}
          >
            <Text style={styles.buttonText}>getInfoX</Text>
          </Button>
          <Button
            small
            onPress={async () => {
              setItemObject<boolean>(StorageItem.bricked, false);
            }}
          >
            <Text style={styles.buttonText}>set bricked false</Text>
          </Button>
          <Button
            small
            onPress={async () => {
              setItemObject<boolean>(StorageItem.bricked, true);
            }}
          >
            <Text style={styles.buttonText}>set bricked true</Text>
          </Button>
          <Button
            small
            onPress={async () => {
              // const res = await fetch("http://192.168.10.120:8095/foaf");
              const res = await fetch("https://dunder.blixtwallet.com/channel-liquidity");
              const json: { pairs: any[] } = await res.json();

              const x = json.pairs
                .filter((c) => c.history.successAmtSat > 0)
                .map((c) => {
                  return {
                    nodeFrom: hexToUint8Array(c.nodeFrom),
                    nodeTo: hexToUint8Array(c.nodeTo),
                    history: {
                      successAmtSat: BigInt(c.history.successAmtSat),
                      successTime: BigInt(c.history.successTime),
                    },
                  };
                });

              // const x: routerrpc.IXImportMissionControlRequest["pairs"] = json.pairs.slice(0, 10).map((c) => {
              //   return {
              //     nodeFrom: hexToUint8Array(c.nodeFrom),
              //     nodeTo: hexToUint8Array(c.nodeTo),
              //     history: {
              //       successAmtSat: Long.fromValue(c.history.successAmtSat),
              //       successTime: Long.fromValue(c.history.successTime),
              //     }
              //   }
              // });
              console.log(x);
              console.log(await routerXImportMissionControl({ pairs: x }));
            }}
          >
            <Text style={styles.buttonText}>ximport</Text>
          </Button>
          <Button
            small
            onPress={async () => {
              const c = await listChannels({});
              const mc = await routerQueryMissionControl({});
              console.log(
                mc.pairs.map((p) => {
                  return {
                    nodeFrom: bytesToHexString(p.nodeFrom),
                    nodeTo: bytesToHexString(p.nodeTo),
                    history: {
                      successAmtSat: Number(p.history?.successAmtSat!),
                      successTime: Number(p.history?.successTime!),
                    },
                  };
                }),
              );
            }}
          >
            <Text style={styles.buttonText}>QueryMissionControl</Text>
          </Button>
          <Button
            small
            onPress={async () => {
              console.log(await NativeModules.LndMobileTools.getInternalFiles());
              const files = await NativeModules.LndMobileTools.getInternalFiles();
              let totalBytes = 0;
              Object.keys(files).map((key) => {
                totalBytes += files[key];
                (files[key] as any) = (files[key] / 1000000).toFixed(2) + " MB";
              });

              console.log(JSON.stringify(files, undefined, 4));
              Alert.alert("", JSON.stringify(files, undefined, 4));
              console.log("Total GB: " + totalBytes / 1000000000);
            }}
          >
            <Text style={styles.buttonText}>LndMobileTools.getInternalFiles()</Text>
          </Button>
          <Button
            small
            onPress={async () => {
              console.error("error");
            }}
          >
            <Text style={styles.buttonText}>console.error("error")</Text>
          </Button>
          <Button
            small
            onPress={async () => {
              try {
                await db!.executeSql("ALTER TABLE contact ADD label TEXT NULL");
                toast("Done");
              } catch (e: any) {
                toast(e.message);
              }
            }}
          >
            <Text style={styles.buttonText}>contact label fix</Text>
          </Button>
          <Button
            small
            onPress={async () => {
              await setItemObject(StorageItem.persistentServicesEnabled, false);
            }}
          >
            <Text style={styles.buttonText}>persistentServicesEnabled = false</Text>
          </Button>
          <Button
            small
            onPress={async () => {
              await setItemObject(StorageItem.persistentServicesWarningShown, false);
            }}
          >
            <Text style={styles.buttonText}>persistentServicesWarningShown = false</Text>
          </Button>
          <Button
            small
            onPress={async () => {
              console.log(
                await (
                  await fetch("https://dunder.blixtwallet.com/ondemand-channel/service-status")
                ).text(),
              );
            }}
          >
            <Text style={styles.buttonText}>dunder service status</Text>
          </Button>
          <Button
            small
            onPress={async () => {
              console.log(
                await (
                  await fetch(
                    "http://mempoolhqx4isw62xs7abwphsq7ldayuidyx2v2oethdhhj6mlo2r6ad.onion/",
                  )
                ).text(),
              );
            }}
          >
            <Text style={styles.buttonText}>mempool</Text>
          </Button>
          <Button
            small
            onPress={async () => {
              await NativeModules.BlixtTor.showMsg();
            }}
          >
            <Text style={styles.buttonText}>show DOKI activity</Text>
          </Button>
          <Button
            small
            onPress={async () => {
              Alert.alert("", (await Linking.getInitialURL()) ?? "no");
            }}
          >
            <Text style={styles.buttonText}>getInitialURL</Text>
          </Button>
          <Button
            small
            onPress={async () => {
              console.log(await generateSecureRandom(32));
            }}
          >
            <Text style={styles.buttonText}>generateSecureRandom</Text>
          </Button>
          <Button
            small
            onPress={async () => {
              console.log(await generateSecureRandomAsBase64(32));
            }}
          >
            <Text style={styles.buttonText}>generateSecureRandomAsBase64</Text>
          </Button>
          <Button
            small
            onPress={async () => {
              const encoder = new TextEncoder();
              console.log(encoder);
            }}
          >
            <Text style={styles.buttonText}>TextEncoder</Text>
          </Button>
          <Button
            small
            onPress={async () => {
              const metadata =
                '[["text/plain","lnurl-pay chat:  Comment 📝"],["text/long-desc","Write a message to be displayed on chat.blixtwallet.com.\\n\\nOnce the payment goes through, your message will be displayed on the web page."]]';

              console.log(await JSHash(metadata, CONSTANTS.HashAlgorithms.sha256));
              console.log("");
              try {
              } catch (e: any) {
                console.log("error");
              }
            }}
          >
            <Text style={styles.buttonText}>favicon etleneum</Text>
          </Button>
          <Button
            small
            onPress={async () => {
              console.log(
                await decodePayReq({
                  payReq:
                    "lnbc100n1p0nzg2kpp58f2ztjy39ak8hgd7saya4mvkhwmueuyq0tlet5fedn8ytu3xrllqhp5nh0t5w4w5zh8jdnn5a03hk4pk279l3eex4nzazgkwmqpn7wga6hqcqzpgxq92fjuqsp5sm4zt7024wpwplf705k0gfkyqzk3g984nv9e83pd4093ckg9sm2q9qy9qsqs0wuxrqazy9n0knyx7fhud4q2l92fl2c2qe58tks8hhgfy4dwc5kqe09j38szhjwshna0jp5pet7g27wdj7ecyq4y00vc023lzvtl2sq686za3",
                }),
              );
              console.log(
                await queryRoutes({
                  pubKey: "03abf6f44c355dec0d5aa155bdbdd6e0c8fefe318eff402de65c6eb2e1be55dc3e",
                }),
              );
            }}
          >
            <Text style={styles.buttonText}>decode()</Text>
          </Button>
          <Button
            small
            onPress={async () => {
              console.log(await NativeModules.LndMobileTools.getTorEnabled());
            }}
          >
            <Text style={styles.buttonText}>getTorEnabled</Text>
          </Button>
          <Button
            small
            onPress={async () => {
              console.log("Tor", await NativeModules.BlixtTor.startTor());
            }}
          >
            <Text style={styles.buttonText}>startTor</Text>
          </Button>
          <Button
            small
            onPress={async () => {
              console.log("Tor", await NativeModules.BlixtTor.stopTor());
            }}
          >
            <Text style={styles.buttonText}>stopTor</Text>
          </Button>
          <Button
            small
            onPress={() => {
              toast("Copied to clipboard.", undefined, "success");
            }}
          >
            <Text style={styles.buttonText}>Toast</Text>
          </Button>
          <Button
            small
            onPress={() => {
              setTimeout(() => {
                console.log("TOAST!");
                toast("Copied to clipboard.", undefined, "success");
                console.log("TOAST2!");
              }, 2000);
            }}
          >
            <Text style={styles.buttonText}>Toast crash</Text>
          </Button>
          <Button
            small
            onPress={async () => {
              invoicesSubscribeSingleInvoice(
                {
                  rHash: new Uint8Array([0, 1, 2, 3]),
                },
                (res) => {
                  console.log("DevScreen: Invoice subscription:", res);
                },
                (err) => console.warn("DevScreen: invoice subscription warning", err),
              );
            }}
          >
            <Text style={styles.buttonText}>Emit fake transaction</Text>
          </Button>
          <Button
            small
            onPress={async () => {
              actions.scheduledSync.setSyncEnabled(true);
            }}
          >
            <Text style={styles.buttonText}>scheduledSync.setSyncEnabled(true)</Text>
          </Button>
          <Button
            small
            onPress={async () => {
              actions.scheduledSync.setSyncEnabled(false);
            }}
          >
            <Text style={styles.buttonText}>scheduledSync.setSyncEnabled(false)</Text>
          </Button>
          <Button
            small
            onPress={async () => {
              actions.settings.setScheduledGossipSyncEnabled(false);
            }}
          >
            <Text style={styles.buttonText}>scheduledGossipSync.setSyncEnabled(true)</Text>
          </Button>
          <Button
            small
            onPress={async () => {
              actions.settings.setScheduledGossipSyncEnabled(true);
            }}
          >
            <Text style={styles.buttonText}>scheduledGossipSync.setSyncEnabled(false)</Text>
          </Button>
          <Button
            small
            onPress={async () => {
              setItemObject<boolean>(StorageItem.scheduledGossipSyncEnabled, false);
            }}
          >
            <Text style={styles.buttonText}>scheduledGossipSyncEnabled = false</Text>
          </Button>
          <Button
            small
            onPress={async () => {
              interface IDemoInvoice {
                description: string;
                value: number;
                type: "PAY" | "RECEIVE";
                payer?: string;
                website?: string;
                lightningService: keyof ILightningServices | null;
              }
              const createDemoTransactions = async (invoices: IDemoInvoice[]) => {
                for (const invoice of invoices) {
                  await createTransaction(db!, {
                    date: Long.fromNumber(1546300800 + Math.floor(Math.random() * 1000000)),
                    description: invoice.description,
                    remotePubkey:
                      "02ad5e3811fb075e69fe2f038fcc1ece7dfb47150a3b20698f3e9845ef6b6283b6",
                    expire: Long.fromNumber(1577836800 + Math.floor(Math.random() * 1000)),
                    status: "SETTLED",
                    value: Long.fromNumber((invoice.type == "PAY" ? -1 : 1) * invoice.value),
                    valueMsat: Long.fromNumber(
                      (invoice.type == "PAY" ? -1 : 1) * invoice.value * 1000,
                    ),
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
                    website: invoice.website ?? null,
                    hops: [],
                    preimage: new Uint8Array([0, 0]),
                    lnurlPayResponse: null,
                    identifiedService: invoice.lightningService,
                    duration: null,
                    lightningAddress: null,
                    lud16IdentifierMimeType: null,
                    lud18PayerData: null,
                  });
                }
              };

              await clearTransactions(db!);
              await createDemoTransactions([
                {
                  value: 150,
                  description: "Read: Lightning Network Trivia",
                  type: "PAY",
                  website: "yalls.org",
                  lightningService: "yalls",
                },
                {
                  value: 100,
                  description: "lightning.gifts redeem 369db072d4252ca056a2a92150b87c6", //7f1f8b0d9a9001d0a",
                  type: "RECEIVE",
                  website: "api.lightning.gifts",
                  lightningService: "lightninggifts",
                },
                {
                  value: 62,
                  description: "Payment for 62 pixels at satoshis.place",
                  type: "PAY",
                  website: "satoshis.place",
                  lightningService: "satoshisplace",
                },
                {
                  value: 100,
                  description: "Withdrawal",
                  type: "RECEIVE",
                  website: "thndr.games",
                  lightningService: "thndrgames",
                },
                {
                  value: 100,
                  description: "etleneum exchange [c7k1dl3gdg3][row4f18ktv]",
                  type: "RECEIVE",
                  website: "etleneum.com",
                  lightningService: "etleneum",
                },
                {
                  value: 1000,
                  description: "LuckyThunder.com pin:2164",
                  type: "PAY",
                  website: "www.luckythunder.com",
                  lightningService: "luckythunder",
                },
                {
                  value: 700,
                  description: "lnsms.world: One text message",
                  type: "PAY",
                  website: "lnsms.world",
                  lightningService: "lnsms",
                },
                {
                  value: 17600,
                  description: "Bitrefill 12507155-a8ff-82a1-1cd4-f79a1346d5c2",
                  type: "PAY",
                  lightningService: "bitrefill",
                },
                {
                  value: 1000,
                  description: "Feed Chickens @ pollofeed.com",
                  type: "PAY",
                  website: "pollofeed.com",
                  lightningService: "pollofeed",
                },
                {
                  value: 1000,
                  description: "1000 sats bet on 2",
                  type: "PAY",
                  website: "lightningspin.com",
                  lightningService: "lightningspin",
                },
              ]);
              await TransactionStoreGetTransactions();

              await setItem(StorageItem.onboardingState, "DONE");
              actions.setOnboardingState("DONE");
              actions.channel.setBalance(BigInt(497581));
            }}
          >
            <Text style={styles.buttonText}>Setup demo environment</Text>
          </Button>
          <Button
            small
            onPress={async () => {
              console.log(localNotification("TEST NOTIFICATION"));
            }}
          >
            <Text style={styles.buttonText}>localNotification</Text>
          </Button>
          <Button
            small
            onPress={async () => {
              console.log(await NativeModules.LndMobileTools.tailLog(10));
            }}
          >
            <Text style={styles.buttonText}>LndMobileTools.tailLog</Text>
          </Button>

          <Button
            small
            onPress={async () => {
              const { send, close } = channelAcceptor(
                (event) => {
                  send({
                    pendingChanId: event.pendingChanId,
                    accept: true,
                    zeroConf: true,
                  });
                },
                (error) => {
                  console.warn("Channel acceptance error: ", error);
                  close();
                },
              );
            }}
          >
            <Text style={styles.buttonText}>channelAcceptor</Text>
          </Button>
          <Button
            small
            onPress={async () => {
              console.log(NativeModules.LndMobileTools);
              console.log(NativeModules.LndMobileTools.writeConfigFile());
            }}
          >
            <Text style={styles.buttonText}>NativeModules.LndMobileTools.writeConfigFile()</Text>
          </Button>
          <Button
            small
            onPress={async () => {
              console.log(NativeModules.LndMobile);
              console.log(await NativeModules.LndMobile.startLnd(false, ""));
            }}
          >
            <Text style={styles.buttonText}>NativeModules.LndMobile.startLnd()</Text>
          </Button>

          <Button
            small
            onPress={async () => {
              const request = {
                cipherSeedMnemonic: [
                  "ability",
                  "quote",
                  "laugh",
                  "pony",
                  "fancy",
                  "disease",
                  "zoo",
                  "angle",
                  "autumn",
                  "december",
                  "absorb",
                  "giraffe",
                  "mandate",
                  "inner",
                  "alone",
                  "flat",
                  "dose",
                  "acoustic",
                  "slice",
                  "major",
                  "sample",
                  "crane",
                  "opinion",
                  "jewel",
                ],
                walletPassword: stringToUint8Array("Test12345!"),
              };

              const initWalletResponse = await initWallet(request);

              console.log(initWalletResponse);
            }}
          >
            <Text style={styles.buttonText}>NativeModules.LndMobile.initWallet()</Text>
          </Button>

          <Button
            small
            onPress={async () => {
              const response = await NativeModules.LndMobileTools.checkICloudEnabled();
              console.log(response);
            }}
          >
            <Text style={styles.buttonText}>checkICloudEnabled()</Text>
          </Button>
          <Button
            small
            onPress={async () => {
              const response = await iCloudStorage.getItem(ICLOUD_BACKUP_KEY);
              console.log(response);
            }}
          >
            <Text style={styles.buttonText}>ICloudStore.getItem()</Text>
          </Button>
          <Button
            small
            onPress={async () => {
              const response = await setItemObject<number>(StorageItem.lastICloudBackup, 0);
              console.log(response);
            }}
          >
            <Text style={styles.buttonText}>set lastICloudBackup to 0</Text>
          </Button>

          {/*
           *
           * Security
           *
           */}
          <Text style={{ width: "100%" }}>Security:</Text>
          <Button
            small
            onPress={async () => {
              await setItemObject(StorageItem.loginMethods, []);
            }}
          >
            <Text style={styles.buttonText}>set loginMethods to []</Text>
          </Button>
          <Button
            small
            onPress={async () => {
              console.log(await getWalletPassword());
            }}
          >
            <Text style={styles.buttonText}>getGenericPassword</Text>
          </Button>
          <Button small onPress={async () => console.log(await getWalletPassword())}>
            <Text style={styles.buttonText}>getWalletPassword()</Text>
          </Button>
          <Button small onPress={async () => console.log(await getPin())}>
            <Text style={styles.buttonText}>getPin()</Text>
          </Button>
          <Button
            small
            onPress={async () => {
              NativeModules.LndMobileTools.restartApp();
            }}
          >
            <Text style={styles.buttonText}>restartApp()</Text>
          </Button>
          <Button
            small
            onPress={async () => {
              console.log(await NativeModules.LndMobileTools.DEBUG_listProcesses());
            }}
          >
            <Text style={styles.buttonText}>DEBUG_listProcesses()</Text>
          </Button>

          {/*
           *
           * Dangerous
           *
           */}
          <Text style={{ width: "100%" }}>Dangerous:</Text>
          <Button
            danger
            small
            onPress={async () => {
              Alert.alert("Are you sure?", "", [
                {
                  style: "cancel",
                  text: "No",
                },
                {
                  style: "default",
                  text: "Yes",
                  onPress: () => {
                    actions.clearApp();
                  },
                },
              ]);
            }}
          >
            <Text style={styles.buttonText}>actions.clearApp()</Text>
          </Button>
          <Button
            danger
            small
            onPress={async () => {
              Alert.alert("Are you sure?", "", [
                {
                  style: "cancel",
                  text: "No",
                },
                {
                  style: "default",
                  text: "Yes",
                  onPress: async () => {
                    console.log(await NativeModules.LndMobileTools.DEBUG_deleteWallet());
                  },
                },
              ]);
            }}
          >
            <Text style={styles.buttonText}>DEBUG_deleteWallet</Text>
          </Button>
          <Button
            danger
            small
            onPress={async () => {
              Alert.alert("Are you sure?", "", [
                {
                  style: "cancel",
                  text: "No",
                },
                {
                  style: "default",
                  text: "Yes",
                  onPress: async () => {
                    console.log(await NativeModules.LndMobileTools.DEBUG_deleteDatafolder());
                  },
                },
              ]);
            }}
          >
            <Text style={styles.buttonText}>DEBUG_deleteDatafolder</Text>
          </Button>

          {/*
           *
           * App storage
           *
           */}
          <Text style={{ width: "100%" }}>App storage:</Text>
          <Button small onPress={async () => actions.openDb()}>
            <Text style={styles.buttonText}>actions.openDb()</Text>
          </Button>
          <Button small onPress={async () => actions.resetDb()}>
            <Text style={styles.buttonText}>actions.resetDb()</Text>
          </Button>
          <Button
            small
            onPress={async () => await setItem(StorageItem.lndChainBackend, "neutrino")}
          >
            <Text style={styles.buttonText}>lndChainBackend = neutrino</Text>
          </Button>
          <Button
            small
            onPress={async () => await setItem(StorageItem.lndChainBackend, "bitcoindWithZmq")}
          >
            <Text style={styles.buttonText}>lndChainBackend = bitcoindWithZmq</Text>
          </Button>
          <Button
            small
            onPress={async () =>
              await setItem(StorageItem.lndChainBackend, "bitcoindWithRpcPolling")
            }
          >
            <Text style={styles.buttonText}>lndChainBackend = bitcoindWithRpcPolling</Text>
          </Button>
          <Button small onPress={async () => await setItemObject(StorageItem.walletCreated, true)}>
            <Text style={styles.buttonText}>walletCreated = true</Text>
          </Button>
          <Button
            small
            onPress={async () => await setItemObject(StorageItem.bitcoinUnit, "bitcoin")}
          >
            <Text style={styles.buttonText}>set bitcoinUnit to bitcoin</Text>
          </Button>
          <Button small onPress={async () => await setItemObject(StorageItem.torEnabled, true)}>
            <Text style={styles.buttonText}>torEnabled = true</Text>
          </Button>
          <Button small onPress={async () => await setItemObject(StorageItem.torEnabled, false)}>
            <Text style={styles.buttonText}>torEnabled = false</Text>
          </Button>
          <Button small onPress={async () => await setItemObject(StorageItem.appVersion, 27)}>
            <Text style={styles.buttonText}>appVersion = 27</Text>
          </Button>
          <Button small onPress={async () => await setItemObject(StorageItem.appVersion, 28)}>
            <Text style={styles.buttonText}>appVersion = 28</Text>
          </Button>
          <Button small onPress={async () => await setItemObject(StorageItem.appVersion, 38)}>
            <Text style={styles.buttonText}>appVersion = 38</Text>
          </Button>
          <Button
            small
            onPress={async () => {
              await setItem(StorageItem.onboardingState, "SEND_ONCHAIN");
              actions.changeOnboardingState("SEND_ONCHAIN");
            }}
          >
            <Text style={styles.buttonText}>onboardingState = SEND_ONCHAIN</Text>
          </Button>
          <Button
            small
            onPress={async () => {
              await setItem(StorageItem.onboardingState, "DO_BACKUP");
              actions.changeOnboardingState("DO_BACKUP");
            }}
          >
            <Text style={styles.buttonText}>onboardingState = DO_BACKUP</Text>
          </Button>
          <Button
            small
            onPress={async () => {
              await setItem(StorageItem.onboardingState, "DONE");
              actions.changeOnboardingState("DONE");
            }}
          >
            <Text style={styles.buttonText}>onboardingState = DONE</Text>
          </Button>

          {/*
           *
           * Lightning Box
           *
           */}
          <Text style={{ width: "100%" }}>Lightning Box:</Text>
          <Button
            small
            onPress={async () => {
              setItem(StorageItem.lightningBoxAddress, "");
            }}
          >
            <Text style={styles.buttonText}>lightningBoxAddress = ""</Text>
          </Button>
          <Button
            small
            onPress={async () => {
              const t = await Alert.promisePromptCallback("lightningBoxAddress");
              setItem(StorageItem.lightningBoxAddress, t);
            }}
          >
            <Text style={styles.buttonText}>lightningBoxAddress prompt</Text>
          </Button>

          {/*
           *
           * Speedloader
           *
           */}
          <Text style={{ width: "100%" }}>Speedloader:</Text>
          <Button
            small
            onPress={async () => {
              console.log(NativeModules.LndMobileTools.DEBUG_deleteSpeedloaderLastrunFile());
            }}
          >
            <Text style={styles.buttonText}>
              NativeModules.LndMobileTools.DEBUG_deleteSpeedloaderLastrunFile()
            </Text>
          </Button>
          <Button
            small
            onPress={async () => {
              console.log(NativeModules.LndMobileTools.DEBUG_deleteSpeedloaderDgraphDirectory());
            }}
          >
            <Text style={styles.buttonText}>
              NativeModules.LndMobileTools.DEBUG_deleteSpeedloaderDgraphDirectory()
            </Text>
          </Button>

          <Button small onPress={async () => await stopDaemon({})}>
            <Text style={styles.buttonText}>StopLnd()</Text>
          </Button>
          <Button
            small
            onPress={async () => {
              try {
                console.log(
                  await NativeModules.LndMobileTools.DEBUG_getWalletPasswordFromKeychain(),
                );
              } catch (e: any) {
                console.log(e);
              }
            }}
          >
            <Text style={styles.buttonText}>
              LndMobileTools.DEBUG_getWalletPasswordFromKeychain()
            </Text>
          </Button>
          <Button
            small
            onPress={async () => console.log(await NativeModules.LndMobileTools.saveLogs())}
          >
            <Text style={styles.buttonText}>saveLogs</Text>
          </Button>
          <Button
            small
            onPress={async () => console.log(await NativeModules.LndMobileTools.copyLndLog())}
          >
            <Text style={styles.buttonText}>copyLndLog</Text>
          </Button>
          <Button
            small
            onPress={async () => {
              try {
                const result = await NativeModules.LndMobileTools.writeConfigFile();
                console.log("writeConfigFile()", result);
                setCommandResult(`"${result}"`);
                setError("{}");
              } catch (e: any) {
                setError(e);
                setCommandResult({});
              }
            }}
          >
            <Text style={styles.buttonText}>writeConfigFile()</Text>
          </Button>
          <Button
            small
            onPress={async () => {
              try {
                const result = await connectPeer({
                  addr: {
                    host: "52.50.244.44:9735",
                    pubkey: "030c3f19d742ca294a55c00376b3b355c3c90d61c6b6b39554dbc7ac19b141c14f",
                  },
                });
                console.log("connectPeer()", result);
                setCommandResult(`"${result}"`);
                setError("{}");
              } catch (e: any) {
                setError(e);
                setCommandResult({});
              }
            }}
          >
            <Text style={styles.buttonText}>connect to Bitrefill node</Text>
          </Button>
          <Button
            small
            onPress={async () => {
              console.log(NativeModules.LndMobileTools.DEBUG_deleteNeutrinoFiles());
            }}
          >
            <Text style={styles.buttonText}>
              NativeModules.LndMobileTools.DEBUG_deleteNeutrinoFiles()
            </Text>
          </Button>

          {/*
           *
           * Sqlite
           *
           */}
          <Text style={{ width: "100%" }}>Sqlite:</Text>
          <Button
            small
            onPress={async () =>
              console.log(
                await createTransaction(db!, {
                  date: Long.fromValue(
                    Math.floor(+new Date() / 1000) + Math.floor(Math.random() * 1000),
                  ),
                  description: "Alice:  Lunch Phil's Burger",
                  remotePubkey:
                    "02ad5e3811fb075e69fe2f038fcc1ece7dfb47150a3b20698f3e9845ef6b6283b6",
                  expire: Long.fromValue(
                    Math.floor(+new Date() / 1000) + Math.floor(1000 + Math.random() * 1000),
                  ),
                  status: "SETTLED",
                  value: Long.fromValue(-1 * Math.floor(Math.random() * 10000)),
                  valueMsat: Long.fromValue(1000),
                  amtPaidSat: Long.fromValue(-1 * Math.floor(Math.random() * 10000)),
                  amtPaidMsat: Long.fromNumber(1000),
                  paymentRequest: "abcdef123456",
                  rHash: "abcdef123456",
                  type: "NORMAL",
                  fee: Long.fromNumber(0),
                  feeMsat: Long.fromNumber(0),
                  nodeAliasCached: null,
                  valueUSD: 0,
                  valueFiat: 0,
                  valueFiatCurrency: "USD",
                  tlvRecordName: null,
                  locationLong: null,
                  locationLat: null,
                  website: null,
                  preimage: new Uint8Array([0]),
                  lnurlPayResponse: null,
                  hops: [],
                  duration: null,
                  identifiedService: null,
                  lightningAddress: null,
                  lud16IdentifierMimeType: null,
                  lud18PayerData: null,
                }),
              )
            }
          >
            <Text style={styles.buttonText}>createTransaction()</Text>
          </Button>
          <Button
            small
            onPress={async () => {
              interface IDemoInvoice {
                description: string;
                value: number;
                type: "PAY" | "RECEIVE";
                payer?: string;
                website?: string;
              }
              const createDemoTransactions = async (invoices: IDemoInvoice[]) => {
                for (const invoice of invoices) {
                  const value =
                    invoice.value +
                    (invoice.type == "PAY" ? -1 : 1) * Math.floor(Math.random() * 500) +
                    Math.floor(Math.random() * 1000);
                  await createTransaction(db!, {
                    date: Long.fromNumber(1546300800 + Math.floor(Math.random() * 1000000)),
                    description: invoice.description,
                    remotePubkey:
                      "02ad5e3811fb075e69fe2f038fcc1ece7dfb47150a3b20698f3e9845ef6b6283b6",
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
                    website: invoice.website ?? null,
                    hops: [],
                    preimage: new Uint8Array([0, 0]),
                    lnurlPayResponse: null,
                    duration: null,
                    identifiedService: null,
                    lightningAddress: null,
                    lud16IdentifierMimeType: null,
                    lud18PayerData: null,
                  });
                }
              };

              await createDemoTransactions([
                {
                  value: 150,
                  description: "Read: Best non-custodial lightning net",
                  type: "PAY",
                  website: "yalls.org",
                },
                {
                  value: 100,
                  description:
                    "lightning.gifts redeem 369db072d4252ca056a2a92150b87c67f1f8b0d9a9001d0a",
                  type: "RECEIVE",
                  website: "api.lightning.gifts",
                },
                {
                  value: 62,
                  description: "Payment for 62 pixels at satoshis.place",
                  type: "PAY",
                  website: "satoshis.place",
                },
                {
                  value: 1000,
                  description: "LuckyThunder.com pin:2164",
                  type: "PAY",
                  website: "www.luckythunder.com",
                },
                {
                  value: 700,
                  description: "lnsms.world: One text message",
                  type: "PAY",
                  website: "lnsms.world",
                },
                {
                  value: 1000,
                  description: "Feed Chickens @ pollofeed.com",
                  type: "PAY",
                  website: "pollofeed.com",
                },
                {
                  value: 1000,
                  description: "1000 sats bet on 2",
                  type: "RECEIVE",
                  website: "lightningspin.com",
                },
              ]);

              // await createDemoTransactions([{
              //   value: 2989,
              //   description: "Alice:  Lunch Phil's Burger",
              //   type: "PAY"
              // }, {
              //   value: 11348,
              //   description: "Dinner",
              //   payer: "John",
              //   type: "RECEIVE"
              // }, {
              //   value: 100953,
              //   description: "Tor Foundation:  Donation",
              //   type: "PAY",
              // }, {
              //   value: 50000,
              //   description: "Lunch",
              //   payer: "Sarah",
              //   type: "RECEIVE",
              // }, {
              //   value: 1000086,
              //   description: "Bitcoin Core:  Donation",
              //   type: "PAY",
              // }, {
              //   value: 1000606,
              //   description: "Alpaca socks:  Receipt #1a5f1",
              //   type: "PAY",
              // },  {
              //   value: 43019,
              //   description: "Dinner",
              //   payer: "Michael",
              //   type: "RECEIVE",
              // }]);
            }}
          >
            <Text style={styles.buttonText}>Create demo transactions</Text>
          </Button>
          <Button small onPress={async () => console.log(await TransactionStoreGetTransactions())}>
            <Text style={styles.buttonText}>Transaction store: getTransactions()</Text>
          </Button>
          <Button small onPress={async () => console.log(await getTransactions(db!, false))}>
            <Text style={styles.buttonText}>getTransactions()</Text>
          </Button>
          <Button small onPress={async () => console.log(await getTransaction(db!, 1))}>
            <Text style={styles.buttonText}>getTransaction(1)</Text>
          </Button>
          <Button small onPress={async () => console.log(await clearTransactions(db!))}>
            <Text style={styles.buttonText}>actions.clearTransactions()</Text>
          </Button>

          {/*
           *
           * Lndmobile commands
           *
           */}
          <Text style={{ width: "100%" }}>Lndmobile commands:</Text>
          {[
            ["getInfo", getInfo],
            ["genSeed", genSeed],
            ["newAddress", newAddress],
            ["pendingChannels", pendingChannels],
            ["listChannels", listChannels],
            ["listPeers", listPeers],
            ["listUnspent", listUnspent],
            ["listInvoices", listInvoices],
            ["getNetworkInfo", getNetworkInfo],
            ["getTransactions", listTransactions],
            ["closedChannels", closedChannels],
          ].map(([name, f], i) => {
            return (
              <Button
                small
                key={i}
                onPress={async () => {
                  try {
                    // Check if 'f' is a function before calling it
                    if (typeof f === "function") {
                      const response = await f({});
                      console.log(`${name}()`, response);
                      setCommandResult(response);
                    } else {
                      // Handle the case where 'f' is not a function
                      console.error(`The command '${name}' is not associated with a function.`);
                    }
                    setError({});
                  } catch (e: any) {
                    setError(e);
                    setCommandResult({});
                  }
                }}
              >
                <Text style={styles.buttonText}>{`${name}()`}</Text>
              </Button>
            );
          })}
          <Button
            small
            onPress={async () => {
              try {
                const response = await addInvoice({
                  isAmp: true,
                  value: BigInt(2000),
                  memo: "AMP Invoice",
                });
                console.log(response);
                console.log(response.paymentRequest);
                setCommandResult(response);
                setError({});
              } catch (e: any) {
                setError(e);
                setCommandResult({});
              }
            }}
          >
            <Text style={styles.buttonText}>addInvoice AMP</Text>
          </Button>
          <Button
            small
            onPress={async () => {
              try {
                const response = await autopilotStatus({});
                console.log(response);
                console.log(response.active);
                setCommandResult(response);
                setError({});
              } catch (e: any) {
                setError(e);
                setCommandResult({});
              }
            }}
          >
            <Text style={styles.buttonText}>Autopilot status</Text>
          </Button>
          <Button
            small
            onPress={async () => {
              try {
                const response = await autopilotModifyStatus({ enable: true });
                console.log(response);
                setCommandResult(response);
                setError({});
              } catch (e: any) {
                setError(e);
                setCommandResult({});
              }
            }}
          >
            <Text style={styles.buttonText}>modifyStatus(true)</Text>
          </Button>
          <Button
            small
            onPress={async () => {
              try {
                const response = await autopilotQueryScores({});
                console.log(response);
                console.log("0", response.results[0].scores);
                console.log("1", response.results[1].scores);
                console.log("2", response.results[2].scores);
                setCommandResult(response);
                setError({});
              } catch (e: any) {
                setError(e);
                setCommandResult({});
              }
            }}
          >
            <Text style={styles.buttonText}>queryScores</Text>
          </Button>
          <Button
            small
            onPress={async () => {
              try {
                const response = await signMessage({
                  msg: stringToUint8Array("signing some message"),
                });
                console.log("signMessage()", response.signature);
                // const privKey = await derivePrivateKey(138, 5);
                // const signedMessage = secp256k1.ecdsaSign(message, privKey.rawKeyBytes);
                // console.log("\nsecp256k1.ecdsaSign()", (signedMessage.signature));
                // console.log("\nsecp256k1.signatureExport()", secp256k1.signatureExport(signedMessage.signature));

                setCommandResult(response);
                setError({});
              } catch (e: any) {
                console.log(e);
                setError(e);
                setCommandResult({});
              }
            }}
          >
            <Text style={styles.buttonText}>signMessage()</Text>
          </Button>

          <Button
            small
            onPress={async () => {
              try {
                const response = await walletBalance({});
                console.log("totalBalance", response.totalBalance);
                console.log("unconfirmedBalance", response.unconfirmedBalance);
                console.log("confirmedBalance", response.confirmedBalance);
                console.log("walletBalance()", response);
                console.log("walletBalance() toJSON", response);
                setCommandResult(response);
                setError({});
              } catch (e: any) {
                setError(e);
                setCommandResult({});
              }
            }}
          >
            <Text style={styles.buttonText}>walletBalance()</Text>
          </Button>
          <Button
            small
            onPress={async () => {
              try {
                const response = await getRecoveryInfo({});

                console.log("GetRecoveryInfo() toJSON", response);
                setCommandResult(response);
                setError({});
              } catch (e: any) {
                setError(e);
                setCommandResult({});
              }
            }}
          >
            <Text style={styles.buttonText}>getRecoveryInfo()</Text>
          </Button>

          {/*
           *
           * easy-peasy store
           *
           */}
          <Text style={{ width: "100%" }}>easy-peasy store:</Text>
          <Button
            small
            onPress={async () => {
              actions.initializeApp();
            }}
          >
            <Text style={styles.buttonText}>easy-peasy store initialize()</Text>
          </Button>
          <Button
            small
            onPress={async () => {
              actions.setAppReady(false);
            }}
          >
            <Text style={styles.buttonText}>actions.setAppReady(false)</Text>
          </Button>
          <Button
            small
            onPress={async () => {
              actions.settings.changeNeutrinoPeers([]);
            }}
          >
            <Text style={styles.buttonText}>actions.changeNeutrinoPeers([]])</Text>
          </Button>
          <Button
            small
            onPress={async () => {
              actions.writeConfig();
            }}
          >
            <Text style={styles.buttonText}>actions.writeConfig()</Text>
          </Button>
        </View>
        <View style={{ backgroundColor: blixtTheme.dark, padding: 15, marginTop: 10 }}>
          <Input
            onChangeText={(text: string) => setChannelPoint(text)}
            placeholder="<funding_tx_id>:<index>"
            value={channelPoint}
          />
          <Button
            small
            danger
            onPress={async () => {
              Alert.alert(
                "Warning: Are you absolutely sure?",
                "Abdandoning a channel means you could potentially lose funds",
                [
                  {
                    style: "cancel",
                    text: "No",
                  },
                  {
                    style: "default",
                    text: "Yes",
                    onPress: async () => {
                      try {
                        const [fundingTxId, index] = channelPoint.split(":");

                        const result = await abandonChannel({
                          iKnowWhatIAmDoing: true,
                          channelPoint: {
                            fundingTxid: {
                              value: fundingTxId,
                              case: "fundingTxidStr",
                            },
                            outputIndex: Number(index),
                          },
                        });
                        console.log("abandon channel() ", result);
                        setCommandResult(result);
                        setError({});
                      } catch (e: any) {
                        setError(e);
                        setCommandResult({});
                      }
                    },
                  },
                ],
              );
            }}
          >
            <Text style={styles.buttonText}>AbandonChannel()</Text>
          </Button>
          <Input
            onChangeText={(text: string) => {
              setConnectPeer(text);
            }}
            placeholder="<pubkey>@><host>"
            value={connectPeerStr}
          />
          <Button
            small
            onPress={async () => {
              try {
                const [pubkey, host] = connectPeerStr.split("@");

                const result = await connectPeer({
                  addr: {
                    pubkey,
                    host,
                  },
                });
                console.log("connectPeer()", result);
                setCommandResult(result);
                setError({});
              } catch (e: any) {
                setError(e);
                setCommandResult({});
              }
            }}
          >
            <Text style={styles.buttonText}>connectPeer()</Text>
          </Button>
          <Button
            small
            onPress={async () => {
              try {
                const [pubkey] = connectPeerStr.split("@");

                const result = await getNodeInfo({ pubKey: pubkey });
                console.log("getNodeInfo()", result);
                setCommandResult(result);
                setError({});
              } catch (e: any) {
                setError(e);
                setCommandResult({});
              }
            }}
          >
            <Text style={styles.buttonText}>getNodeInfo()</Text>
          </Button>

          <Input
            onChangeText={(text) => {
              setSat(text);
            }}
            placeholder="Satoshi"
            keyboardType="numeric"
            value={sat}
          />
          <Button
            small
            onPress={async () => {
              try {
                const [pubkey] = connectPeerStr.split("@");

                const result = await openChannelSync({
                  nodePubkey: hexToUint8Array(pubkey),
                  localFundingAmount: BigInt(100000),
                  private: true,
                });
                console.log("openChannel()", result);
                setCommandResult(result);
                setError({});
              } catch (e: any) {
                setError(e);
                setCommandResult({});
              }
            }}
          >
            <Text style={styles.buttonText}>openChannel()</Text>
          </Button>

          <Input
            onChangeText={(text: string) => {
              setAddr(text);
            }}
            placeholder="Address"
            value={addr}
          />
          <Button
            small
            onPress={async () => {
              try {
                const result = await sendCoins({
                  addr,
                  amount: BigInt(100000),
                });
                console.log("sendCoins()", result);
                setCommandResult(result);
                setError({});
              } catch (e: any) {
                setError(e);
                setCommandResult({});
              }
            }}
          >
            <Text style={styles.buttonText}>sendCoins()</Text>
          </Button>

          <Input
            onChangeText={(text: string) => {
              setTx(text);
            }}
            placeholder="tx"
            value={tx}
          />
          <Button
            small
            onPress={async () => {
              try {
                const [transaction, output] = tx.split(":");
                closeChannel(
                  {
                    channelPoint: {
                      fundingTxid: {
                        case: "fundingTxidStr",
                        value: transaction,
                      },
                      outputIndex: Number(output),
                    },
                  },
                  (result) => {
                    console.log("closeChannel()", result);
                    setCommandResult(result);
                    setError({});
                  },
                  (err) => {
                    setError(err);
                    setCommandResult({});
                  },
                );
              } catch (e: any) {}
            }}
          >
            <Text style={styles.buttonText}>closeChannel()</Text>
          </Button>

          <View style={{ marginTop: 30 }}>
            <Text style={styles.buttonText}>{new Date().toISOString()}:</Text>
            <Text
              style={styles.buttonText}
              selectable={true}
              onPress={() => {
                Clipboard.setString(JSON.stringify(commandResult));
                Toast.show({
                  text: "Copied to clipboard.",
                  type: "success",
                });
              }}
            >
              {JSON.stringify(commandResult, null, 2)}
            </Text>

            <Text style={styles.buttonText}>{new Date().toISOString()} error:</Text>
            <Text
              style={styles.buttonText}
              selectable={true}
              onPress={() => {
                Clipboard.setString(JSON.stringify(commandResult));
                Toast.show({
                  text: "Copied to clipboard.",
                  type: "success",
                });
              }}
            >
              {JSON.stringify(error)}
            </Text>
          </View>
        </View>
      </Content>
    </Container>
  );
}

const styles = StyleSheet.create({
  content: {
    width: "100%",
    padding: 2,
  },
  buttonText: {},
});

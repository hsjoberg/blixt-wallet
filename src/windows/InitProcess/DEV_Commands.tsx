import * as base64 from "base64-js";

import { PLATFORM } from "../../utils/constants";
import { Button, Container, Input, Text, Toast, View } from "native-base";
import { CONSTANTS, JSHash } from "react-native-hash";
import {
  DeviceEventEmitter,
  Linking,
  NativeEventEmitter,
  NativeModules,
  StatusBar,
  StyleSheet,
} from "react-native";
import React, { useState } from "react";
import { StorageItem, setItem, setItemObject } from "../../storage/app";
import { bytesToHexString, hexToUint8Array, stringToUint8Array, toast } from "../../utils";
import {
  channelAcceptor,
  channelAcceptorResponse,
  closeChannel,
  closedChannels,
  decodeChannelAcceptRequest,
  listChannels,
  openChannel,
  pendingChannels,
} from "../../lndmobile/channel";
import {
  addInvoice,
  checkStatus,
  connectPeer,
  decodePayReq,
  getInfo,
  getNetworkInfo,
  getNodeInfo,
  listInvoices,
  listPeers,
  listUnspent,
  queryMissionControl,
  queryRoutes,
  xImportMissionControl,
} from "../../lndmobile/index";
import {
  clearTransactions,
  createTransaction,
  getTransaction,
  getTransactions,
} from "../../storage/database/transaction";
import { genSeed, initWallet, signMessage } from "../../lndmobile/wallet";
import { getPin, getWalletPassword } from "../../storage/keystore";
import { lnrpc, routerrpc } from "../../../proto/lightning";
import { modifyStatus, queryScores, status } from "../../lndmobile/autopilot";
import {
  newAddress,
  sendCoins,
  getTransactions as getTransactionsOnchain,
} from "../../lndmobile/onchain";
import { useStoreActions, useStoreState } from "../../state/store";

import { Alert } from "../../utils/alert";
import Clipboard from "@react-native-clipboard/clipboard";
import Content from "../../components/Content";
import { ICLOUD_BACKUP_KEY } from "../../state/ICloudBackup";
import { ILightningServices } from "../../utils/lightning-services";
import { LndMobileEventEmitter } from "../../utils/event-listener";
import Long from "long";
import PushNotification from "react-native-push-notification";
import { RootStackParamList } from "../../Main";
import { StackNavigationProp } from "@react-navigation/stack";
import { abandonChannel } from "../../lndmobile/channel";
import { blixtTheme } from "../../native-base-theme/variables/commonColor";
import { generateSecureRandom } from "react-native-securerandom";
import { localNotification } from "../../utils/push-notification";
import { sendCommand } from "../../lndmobile/utils";

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
          <Text style={{ width: "100%" }}>Random:</Text>
          <Button
            small
            onPress={async () => {
              // const res = await fetch("http://192.168.10.120:8095/foaf");
              const res = await fetch("https://dunder.blixtwallet.com/channel-liquidity");
              const json: { pairs: any[] } = await res.json();

              const x: routerrpc.IXImportMissionControlRequest["pairs"] = json.pairs
                .filter((c) => c.history.successAmtSat > 0)
                .map((c) => {
                  return {
                    nodeFrom: hexToUint8Array(c.nodeFrom),
                    nodeTo: hexToUint8Array(c.nodeTo),
                    history: {
                      successAmtSat: Long.fromValue(c.history.successAmtSat),
                      successTime: Long.fromValue(c.history.successTime),
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
              console.log(await xImportMissionControl(x));
            }}
          >
            <Text style={styles.buttonText}>ximport</Text>
          </Button>
          <Button
            small
            onPress={async () => {
              const c = await listChannels();
              const mc = await queryMissionControl();
              console.log(
                mc.pairs.map((p) => {
                  return {
                    nodeFrom: bytesToHexString(p.nodeFrom),
                    nodeTo: bytesToHexString(p.nodeTo),
                    history: {
                      successAmtSat: Long.fromValue(p.history?.successAmtSat!).toNumber(),
                      successTime: Long.fromValue(p.history?.successTime!).toNumber(),
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
                await decodePayReq(
                  "lnbc100n1p0nzg2kpp58f2ztjy39ak8hgd7saya4mvkhwmueuyq0tlet5fedn8ytu3xrllqhp5nh0t5w4w5zh8jdnn5a03hk4pk279l3eex4nzazgkwmqpn7wga6hqcqzpgxq92fjuqsp5sm4zt7024wpwplf705k0gfkyqzk3g984nv9e83pd4093ckg9sm2q9qy9qsqs0wuxrqazy9n0knyx7fhud4q2l92fl2c2qe58tks8hhgfy4dwc5kqe09j38szhjwshna0jp5pet7g27wdj7ecyq4y00vc023lzvtl2sq686za3",
                ),
              );
              console.log(
                await queryRoutes(
                  "03abf6f44c355dec0d5aa155bdbdd6e0c8fefe318eff402de65c6eb2e1be55dc3e",
                ),
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
              const subscribeInvoicesUpdate = lnrpc.Invoice.create({
                amtPaid: Long.fromValue(1000),
                amtPaidMsat: Long.fromValue(1000 * 1000),
                rHash: new Uint8Array([0, 1, 2, 3]),
              });

              DeviceEventEmitter.emit("SubscribeInvoices", {
                data: base64.fromByteArray(
                  lnrpc.InvoiceSubscription.encode(subscribeInvoicesUpdate).finish(),
                ),
              });
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
              actions.channel.setBalance(Long.fromNumber(497581));
            }}
          >
            <Text style={styles.buttonText}>Setup demo environment</Text>
          </Button>
          <Button
            small
            onPress={async () => {
              PushNotification.clearLocalNotification("TEST123", 21312);
              // PushNotification.localNotification({
              //   channelId: ANDROID_PUSH_NOTIFICATION_PUSH_CHANNEL_ID,
              //   message: "Persistent 123",
              //   playSound: true,
              //   vibrate: false,
              //   priority: "high",
              //   importance: "high",
              //   autoCancel: true,
              //   ongoing: true,
              //   id: 21312,
              //   tag:"TEST123"
              // })
            }}
          >
            <Text style={styles.buttonText}>persistent</Text>
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
              LndMobileEventEmitter.addListener("ChannelAcceptor", async (event) => {
                try {
                  const channelAcceptRequest = decodeChannelAcceptRequest(event.data);

                  console.log("wantsZeroConf:" + channelAcceptRequest.wantsZeroConf);

                  console.log(
                    await channelAcceptorResponse(channelAcceptRequest.pendingChanId, true, true),
                  );
                } catch (error: any) {
                  console.error("error: " + error.message);
                }
              });

              console.log(await channelAcceptor());
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
              new NativeEventEmitter(NativeModules.LndMobile).addListener(
                "WalletUnlocked",
                (event: any) => {
                  console.log(event);
                },
              );
            }}
          >
            <Text style={styles.buttonText}>Lndmobile add listener</Text>
          </Button>
          <Button
            small
            onPress={async () => {
              const request = lnrpc.InitWalletRequest.create({
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
              });

              const encoded = lnrpc.InitWalletRequest.encode(request).finish();
              const b64 = base64.fromByteArray(encoded);

              console.log(await NativeModules.LndMobile.initWallet(b64, null, null, null));
            }}
          >
            <Text style={styles.buttonText}>NativeModules.LndMobile.initWallet()</Text>
          </Button>
          <Button
            small
            onPress={async () => {
              const request = lnrpc.GetInfoRequest.create({});
              const encoded = lnrpc.GetInfoRequest.encode(request).finish();
              const b64 = base64.fromByteArray(encoded);

              const response = await NativeModules.LndMobile.sendCommand("GetInfo", b64);
              const getInfoResponse = lnrpc.GetInfoResponse.decode(
                base64.toByteArray(response.data),
              );
              console.log(getInfoResponse);
            }}
          >
            <Text style={styles.buttonText}>sendCommand getInfo</Text>
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

          <Text style={{ width: "100%" }}>Speedloader:</Text>
          <Button
            small
            onPress={async () => {
              console.log(await NativeModules.LndMobileTools.DEBUG_deleteSpeedloaderLastrunFile());
            }}
          >
            <Text style={styles.buttonText}>
              NativeModules.LndMobileTools.DEBUG_deleteSpeedloaderLastrunFile()
            </Text>
          </Button>
          <Button
            small
            onPress={async () => {
              console.log(
                await NativeModules.LndMobileTools.DEBUG_deleteSpeedloaderDgraphDirectory(),
              );
            }}
          >
            <Text style={styles.buttonText}>
              NativeModules.LndMobileTools.DEBUG_deleteSpeedloaderDgraphDirectory()
            </Text>
          </Button>
          <Text style={{ width: "100%" }}>lndmobile:</Text>
          <Button small onPress={async () => await NativeModules.LndMobile.initialize()}>
            <Text style={styles.buttonText}>LndMobile.initialize()</Text>
          </Button>
          <Button
            small
            onPress={async () => {
              console.log(await checkStatus());
            }}
          >
            <Text style={styles.buttonText}>LndMobile.checkStatus</Text>
          </Button>
          <Button small onPress={async () => await NativeModules.LndMobile.startLnd(false, "")}>
            <Text style={styles.buttonText}>LndMobile.startLnd()</Text>
          </Button>
          <Button small onPress={async () => await NativeModules.LndMobile.stopLnd()}>
            <Text style={styles.buttonText}>LndMobile.stopLnd()</Text>
          </Button>
          <Button small onPress={async () => await actions.initializeApp()}>
            <Text style={styles.buttonText}>actions.initializeApp()</Text>
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
                const result = await connectPeer(
                  "030c3f19d742ca294a55c00376b3b355c3c90d61c6b6b39554dbc7ac19b141c14f",
                  "52.50.244.44:9735",
                );
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
              console.log(await NativeModules.LndMobileTools.DEBUG_deleteNeutrinoFiles());
            }}
          >
            <Text style={styles.buttonText}>
              NativeModules.LndMobileTools.DEBUG_deleteNeutrinoFiles()
            </Text>
          </Button>
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
            ["getTransactions", getTransactionsOnchain],
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
                      const response = await f(undefined);
                      console.log(`${name}()`, response.toJSON());
                      setCommandResult(response.toJSON());
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
                const response = await addInvoice(0, "AMP", undefined);
                console.log(response);
                console.log(response.paymentRequest);
                setCommandResult(response.toJSON());
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
                const response = await status();
                console.log(response);
                console.log(response.active);
                setCommandResult(response.toJSON());
                setError({});
              } catch (e: any) {
                setError(e);
                setCommandResult({});
              }
            }}
          >
            <Text style={styles.buttonText}>status</Text>
          </Button>
          <Button
            small
            onPress={async () => {
              try {
                const response = await modifyStatus(true);
                console.log(response);
                setCommandResult(response.toJSON());
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
                const response = await queryScores();
                console.log(response);
                console.log("0", response.results[0].scores);
                console.log("1", response.results[1].scores);
                console.log("2", response.results[2].scores);
                setCommandResult(response.toJSON());
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
                const response = await signMessage(138, 5, new Uint8Array([1]));
                console.log("signMessage()", response.signature);
                // const privKey = await derivePrivateKey(138, 5);
                // const signedMessage = secp256k1.ecdsaSign(message, privKey.rawKeyBytes);
                // console.log("\nsecp256k1.ecdsaSign()", (signedMessage.signature));
                // console.log("\nsecp256k1.signatureExport()", secp256k1.signatureExport(signedMessage.signature));

                setCommandResult(response.toJSON());
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
                const response = await sendCommand<
                  lnrpc.IStopRequest,
                  lnrpc.StopRequest,
                  lnrpc.StopResponse
                >({
                  request: lnrpc.StopRequest,
                  response: lnrpc.StopResponse,
                  method: "StopDaemon",
                  options: {},
                });
                console.log("stopDaemon()", response.toJSON());
                setCommandResult(response.toJSON());
                setError({});
              } catch (e: any) {
                setError(e);
                setCommandResult({});
              }
            }}
          >
            <Text style={styles.buttonText}>stopDaemon()</Text>
          </Button>
          <Button
            small
            onPress={async () => {
              try {
                const response = await initWallet(
                  [
                    "absent",
                    "path",
                    "oyster",
                    "net",
                    "pig",
                    "photo",
                    "test",
                    "magic",
                    "inmate",
                    "chair",
                    "wash",
                    "roast",
                    "donor",
                    "glow",
                    "decline",
                    "venue",
                    "observe",
                    "flavor",
                    "ahead",
                    "suit",
                    "easily",
                    "excite",
                    "entire",
                    "scheme",
                  ],
                  "test1234",
                );
                console.log("initWallet()", response.toJSON());
                setCommandResult(response.toJSON());
                setError({});
              } catch (e: any) {
                setError(e);
                setCommandResult({});
              }
            }}
          >
            <Text style={styles.buttonText}>initWallet()</Text>
          </Button>
          <Button
            small
            onPress={async () => {
              try {
                const response = await sendCommand<
                  lnrpc.IWalletBalanceRequest,
                  lnrpc.WalletBalanceRequest,
                  lnrpc.WalletBalanceResponse
                >({
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
                const response = await sendCommand<
                  lnrpc.IGetRecoveryInfoRequest,
                  lnrpc.GetRecoveryInfoRequest,
                  lnrpc.GetRecoveryInfoResponse
                >({
                  request: lnrpc.GetRecoveryInfoRequest,
                  response: lnrpc.GetRecoveryInfoResponse,
                  method: "GetRecoveryInfo",
                  options: {}, // TODO why is totalBalance a option property?
                });

                console.log("GetRecoveryInfo() toJSON", response.toJSON());
                setCommandResult(response.toJSON());
                setError({});
              } catch (e: any) {
                setError(e);
                setCommandResult({});
              }
            }}
          >
            <Text style={styles.buttonText}>getRecoveryInfo()</Text>
          </Button>
          <Text style={{ width: "100%" }}>easy-peasy store:</Text>
          <Button
            small
            onPress={async () => {
              actions.initializeApp();
            }}
          >
            <Text style={styles.buttonText}>easy-peasy store initialize()</Text>
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
                        const result = await abandonChannel(fundingTxId, Number(index));
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

                const result = await connectPeer(pubkey, host);
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

                const result = await getNodeInfo(pubkey);
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

                const result = await openChannel(pubkey, Number.parseInt(sat, 10), true);
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
                const result = await sendCoins(addr, Number.parseInt(sat, 10));
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
                const result = await closeChannel(transaction, Number.parseInt(output, 10), false);
                console.log("closeChannel()", result);
                setCommandResult(result);
                setError({});
              } catch (e: any) {
                setError(e);
                setCommandResult({});
              }
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

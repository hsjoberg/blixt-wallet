import React, { useState, useEffect, useLayoutEffect } from "react";
import { Button, Icon, H1, Input, Text, Spinner } from "native-base";
import { View, KeyboardAvoidingView } from "react-native";
import Clipboard from "@react-native-community/clipboard";
import { sendKeysendPaymentV2 } from "../../lndmobile/index";
import Long from "long";
import { toast, hexToUint8Array } from "../../utils";
import { useStoreState, useStoreActions } from "../../state/store";
import { generateSecureRandom } from "react-native-securerandom";
import { lnrpc } from "../../../proto/proto";
import { getChanInfo, listPrivateChannels } from "../../lndmobile/channel";
import QrCode from "../../components/QrCode";
import BlixtForm from "../../components/Form";
import { NavigationButton } from "../../components/NavigationButton";
import { blixtTheme } from "../../native-base-theme/variables/commonColor";
import { ITransaction } from "../../storage/database/transaction";

interface ILightningInfoProps {
  navigation: any;
}
export default function KeysendTest({ navigation }: ILightningInfoProps) {
  const [sending, setSending] = useState(false);
  const myNodeInfo = useStoreState((store) => store.lightning.nodeInfo);
  const [routehints, setRoutehints] = useState("");

  const [pubkeyInput, setPubkeyInput] = useState("");
  const [routehintsInput, setRoutehintsInput] = useState("");
  const [satInput, setSatInput] = useState("");

  const syncTransaction = useStoreActions((store) => store.transaction.syncTransaction);

  const name = useStoreState((store) => store.settings.name) || "";

  useEffect(() => {
    (async () => {
      await getRouteHints();
    })();
  }, []);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerTitle: "Bitcoin",
      headerShown: true,
      headerRight: () => {
        return (
          <NavigationButton onPress={onPressCamera}>
            <Icon type="AntDesign" name="camera" style={{ fontSize: 22 }} />
          </NavigationButton>
        );
      }
    });
  }, [navigation]);

  const onClickSend = async () => {
    try {
      if (!satInput) {
        throw new Error("Check amount");
      }
      else if (!pubkeyInput) {
        throw new Error("Missing pubkey");
      }
      setSending(true);
      const result = await sendKeysendPaymentV2(
        pubkeyInput,
        Long.fromValue(Number.parseInt(satInput, 10)),
        await generateSecureRandom(32),
        JSON.parse(routehintsInput || "[]"),
        name,
      );
      console.log(result);
      toast("Payment successful");
      console.log("Payment request is " + result.paymentRequest);
      console.log(typeof result.paymentRequest);

      const transaction: ITransaction = {
        date: result.creationDate,
        description: "Keysend payment",
        expire: Long.fromValue(0),
        paymentRequest: result.paymentRequest,
        remotePubkey: pubkeyInput,
        rHash: result.paymentHash,
        status: "SETTLED",
        value: result.value.neg(),
        valueMsat: result.valueMsat.neg().mul(1000),
        amtPaidSat: result.value.neg(),
        amtPaidMsat: result.valueMsat.neg().mul(1000),
        fee: result.fee,
        feeMsat: result.feeMsat,
        nodeAliasCached: null,
        payer: null,
        valueUSD: 0,
        valueFiat: 0,
        valueFiatCurrency: "USD",
        locationLong: null,
        locationLat: null,
        tlvRecordName: null,
        type: "NORMAL",
        website: null,
        identifiedService: null,
        lightningAddress: null,
        lud16IdentifierMimeType: null,

        preimage: hexToUint8Array(result.paymentPreimage),
        lnurlPayResponse: null,

        hops: [],
      };
      syncTransaction(transaction);

    } catch (e) {
      toast(e.message, undefined, "danger");
    }
    setSending(false);
  };

  const getRouteHints = async () => {
    const routeHints: lnrpc.IRouteHint[] = [];
    const channels = await listPrivateChannels();

    // Follows the code in `addInvoice()` of the lnd project
    for (const channel of channels.channels) {
      const chanInfo = await getChanInfo(channel.chanId!);
      const remotePubkey = channel.remotePubkey;
      console.log("chanInfo", chanInfo);

      // TODO check if node is publicly
      // advertised in the network graph
      // https://github.com/lightningnetwork/lnd/blob/38b521d87d3fd9cff628e5dc09b764aeabaf011a/channeldb/graph.go#L2141

      let policy: lnrpc.IRoutingPolicy;
      if (remotePubkey === chanInfo.node1Pub) {
        policy = chanInfo.node1Policy!;
      }
      else {
        policy = chanInfo.node2Policy!;
      }

      if (!policy) {
        continue;
      }

      routeHints.push(lnrpc.RouteHint.create({
        hopHints: [{
          nodeId: remotePubkey,
          chanId: chanInfo.channelId,
          feeBaseMsat: policy.feeBaseMsat ? policy.feeBaseMsat.toNumber() : undefined,
          feeProportionalMillionths: policy.feeRateMilliMsat ? policy.feeRateMilliMsat.toNumber() : undefined,
          cltvExpiryDelta: policy.timeLockDelta,
        }]
      }));
    }
    Clipboard.setString(JSON.stringify(routeHints));

    setRoutehints(JSON.stringify(routeHints));
  };

  const onPressCamera = () => {
    navigation.navigate("CameraFullscreen", {
      onRead: (data: any) => {
        try {
          const json = JSON.parse(data);
          setPubkeyInput(json.pubkey);
          setRoutehintsInput(json.routehints);
          console.log(data);
        } catch (e) {
          console.log(e.message);
        }
      },
    });
  };

  const formItems = [{
    key: "AMOUNT_SAT",
    title: `Amount sat`,
    component: (
      <Input
        testID="input-amount-sat"
        value={satInput}
        onChangeText={setSatInput}
        placeholder="0"
        keyboardType="numeric"
        returnKeyType="done"
      />
    )}, {
      key: "PUBKEY",
      title: `Public key`,
      component: (
        <Input
          testID="input-pubkey"
          value={pubkeyInput}
          onChangeText={setPubkeyInput}
          placeholder="Pubkey"
        />
      )
    }, {
      key: "",
      title: `Route hints`,
      component: (
        <Input
          testID="input-routehints"
          value={routehintsInput}
          onChangeText={setRoutehintsInput}
          placeholder="Route hints"
        />
      )
    },
  ];

  return (
    <KeyboardAvoidingView behavior="height" style={{ flex: 1, backgroundColor: blixtTheme.dark }}>
      <View style={{ alignItems: "center" }}>
        <H1 style={{ marginTop: 10, marginBottom: 5 }}>Keysend - scan to pay</H1>
        {routehints.length > 0  &&
          <QrCode
            size={220}
            data={JSON.stringify({
              pubkey: myNodeInfo!.identityPubkey,
              routehints,
            })}
          />
        }
        {routehints.length === 0 &&
          <View style={{ margin: 4, width: 220 + 26, height: 220 + 26 }}></View>
        }
      </View>
      <View style={{ padding: 16 }}>
        <Text style={{ marginBottom: 8 }}>
          Welcome to the keysend playground.{"\n"}
          Keysend lets you pay another Blixt Wallet (or lnd with keysend enabled) without requiring an invoice.
        </Text>
        <Text>
          Click on the camera to scan another wallet's QR code or provide a public key and route hints below.
        </Text>
      </View>
      <BlixtForm
        style={{ flexGrow: 1}}
        items={formItems}
        buttons={[
          <Button
            style={{ marginTop: 32 }}
            testID="create-invoice"
            primary={true}
            block={true}
            disabled={sending}
            key="CREATE_INVOICE"
            onPress={onClickSend}
          >
            {sending &&
              <Spinner color={blixtTheme.light} />
            }
            {!sending &&
              <Text>Send</Text>
            }
          </Button>
        ]}
      />
    </KeyboardAvoidingView>
  );
}

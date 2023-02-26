import React, { useState, useEffect } from "react";
import { Button, Body, Container, Header, Icon, Left, Title } from "native-base";
import Content from "../../components/Content";
import { TextInput, DeviceEventEmitter, Text } from "react-native";
import Clipboard from "@react-native-community/clipboard";
import {
  sendKeysendPayment,
  decodePaymentStatus,
  addInvoice,
  getNodeInfo,
  sendKeysendPayment2,
} from "../../lndmobile/index";
import Long from "long";
import { hexToUint8Array, timeout, bytesToString, bytesToHexString } from "../../utils";
import { routerrpc } from "../../../proto/router";
import { useStoreState, useStoreActions } from "../../state/store";
import { decodeInvoiceResult } from "../../lndmobile/wallet";
import { generateSecureRandom } from "react-native-securerandom";
import { lnrpc } from "../../../proto/lightning";
import { listChannels, getChanInfo, listPrivateChannels } from "../../lndmobile/channel";
import QrCode from "../../components/QrCode";
import { LndMobileEventEmitter } from "../../utils/event-listener";
import { checkLndStreamErrorResponse } from "../../utils/lndmobile";

interface ILightningInfoProps {
  navigation: any;
}
export default function KeysendTest({ navigation }: ILightningInfoProps) {
  const myNodeInfo = useStoreState((store) => store.lightning.nodeInfo);
  const [routehints, setRoutehints] = useState("");

  const [pubkeyInput, setPubkeyInput] = useState("");
  const [routehintsInput, setRoutehintsInput] = useState("");
  const [satInput, setSatInput] = useState("");

  const name = useStoreState((store) => store.settings.name) || "";
  const register = useStoreActions((store) => store.lightName.register);

  const [getRouteHints1, setGetRouteHints1] = useState("");
  const [getRouteHints2, setGetRouteHints2] = useState("");

  useEffect(() => {
    (async () => {
      await getRouteHints();
    })();
  }, []);

  const onClickSend = async () => {
    const listener = LndMobileEventEmitter.addListener("RouterSendPayment", (e) => {
      console.log(e);
      const response = decodePaymentStatus(e.data);
      console.log(response);

      // listener.remove();
    });

    console.log(bytesToHexString(hexToUint8Array(pubkeyInput)));

    const r = await sendKeysendPayment(
      pubkeyInput,
      Long.fromValue(Number.parseInt(satInput, 10)),
      await generateSecureRandom(32),
      JSON.parse(routehintsInput || "[]"),
      name,
    );
    console.log("response r", r);
  };

  const getPubkey = () => {
    Clipboard.setString(myNodeInfo!.identityPubkey!);
  };

  const getRouteHintsByInvoice = async () => {
    const listener = LndMobileEventEmitter.addListener("SubscribeInvoices", (e) => {
      const invoice = decodeInvoiceResult(e.data);
      console.log("invoice.routeHints", JSON.stringify(invoice.routeHints));
      Clipboard.setString(JSON.stringify(invoice.routeHints));
      setGetRouteHints1(JSON.stringify(invoice.routeHints, null, 2));

      listener.remove();
    });

    const r = await addInvoice(1, "ROUTEHINTS");
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
      } else {
        policy = chanInfo.node2Policy!;
      }

      if (!policy) {
        continue;
      }

      routeHints.push(
        lnrpc.RouteHint.create({
          hopHints: [
            {
              nodeId: remotePubkey,
              chanId: chanInfo.channelId,
              feeBaseMsat: policy.feeBaseMsat ? policy.feeBaseMsat.toNumber() : undefined,
              feeProportionalMillionths: policy.feeRateMilliMsat
                ? policy.feeRateMilliMsat.toNumber()
                : undefined,
              cltvExpiryDelta: policy.timeLockDelta,
            },
          ],
        }),
      );
    }
    Clipboard.setString(JSON.stringify(routeHints));

    setRoutehints(JSON.stringify(routeHints));
    setGetRouteHints2(JSON.stringify(routeHints, null, 2));
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

  const onPressRegister = async () => {
    await register({
      username: "test12345",
    });
  };

  const onPressUpdateRouteHints = async () => {
    await updateRouteHints({
      username: "test12345",
    });
  };

  return (
    <Container>
      <Header iosBarStyle="light-content" translucent={false}>
        <Left>
          <Button transparent={true} onPress={() => navigation.goBack()}>
            <Icon name="arrow-back" />
          </Button>
        </Left>
        <Body>
          <Title>Keysend</Title>
        </Body>
      </Header>
      <Content>
        <TextInput placeholder="Pubkey" value={pubkeyInput} onChangeText={setPubkeyInput} />
        <TextInput
          placeholder="Route hints (JSON)"
          value={routehintsInput}
          onChangeText={setRoutehintsInput}
        />
        <TextInput
          placeholder="Satoshi"
          keyboardType="numeric"
          value={satInput}
          onChangeText={setSatInput}
        />
        <Button onPress={onClickSend}>
          <Text>Send</Text>
        </Button>

        <Button onPress={getPubkey}>
          <Text>Get pubkey to clipboard</Text>
        </Button>
        <Button onPress={getRouteHintsByInvoice}>
          <Text>Get route hints from private invoice to clipboard</Text>
        </Button>
        <Button onPress={getRouteHints}>
          <Text>Get route hints to clipboard</Text>
        </Button>
        <Text>{getRouteHints1}</Text>
        <Text>{getRouteHints2}</Text>

        <Button onPress={onPressRegister}>
          <Text>LightName register</Text>
        </Button>
        <Button onPress={onPressRegister}>
          <Text>LightName seRouteHints</Text>
        </Button>

        <Button onPress={onPressCamera}>
          <Text>Scan</Text>
        </Button>
      </Content>

      {routehints.length > 0 && (
        <QrCode
          size={220}
          data={JSON.stringify({
            pubkey: myNodeInfo!.identityPubkey,
            routehints,
          })}
        />
      )}
    </Container>
  );
}

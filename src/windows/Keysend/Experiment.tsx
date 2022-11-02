import React, { useState, useEffect, useLayoutEffect } from "react";
import { Button, Icon, H1, Text, Spinner } from "native-base";
import { View } from "react-native";
import Clipboard from "@react-native-community/clipboard";
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view'

import { getRouteHints, sendKeysendPaymentV2 } from "../../lndmobile/index";
import Long from "long";
import { toast, hexToUint8Array } from "../../utils";
import { useStoreState, useStoreActions } from "../../state/store";
import { generateSecureRandom } from "react-native-securerandom";
import { lnrpc } from "../../../proto/lightning";
import QrCode from "../../components/QrCode";
import BlixtForm from "../../components/Form";
import { NavigationButton } from "../../components/NavigationButton";
import { blixtTheme } from "../../native-base-theme/variables/commonColor";
import { ITransaction } from "../../storage/database/transaction";
import { StackNavigationProp } from "@react-navigation/stack";
import { RootStackParamList } from "../../Main";
import { translatePaymentFailureReason } from "../../state/Send";
import { PLATFORM } from "../../utils/constants";
import Input from "../../components/Input";

import { useTranslation } from "react-i18next";
import { namespaces } from "../../i18n/i18n.constants";

interface ILightningInfoProps {
  navigation: StackNavigationProp<RootStackParamList, "KeysendExperiment">;
}
export default function KeysendTest({ navigation }: ILightningInfoProps) {
  const t = useTranslation(namespaces.keysend.experiment).t;
  const [sending, setSending] = useState(false);
  const myNodeInfo = useStoreState((store) => store.lightning.nodeInfo);
  const [routehints, setRoutehints] = useState("");

  const [pubkeyInput, setPubkeyInput] = useState("");
  const [routehintsInput, setRoutehintsInput] = useState("");
  const [satInput, setSatInput] = useState("");
  const [messageInput, setMessageInput] = useState("");

  const syncTransaction = useStoreActions((store) => store.transaction.syncTransaction);

  const name = useStoreState((store) => store.settings.name) || "";

  useEffect(() => {
    (async () => {
      setRoutehints(
        JSON.stringify(await getRouteHints())
      );
    })();
  }, []);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerTitle: t("title"),
      headerBackTitle: t("buttons.back",{ns:namespaces.common}),
      headerShown: true,
      headerRight: () => {
        return (
          PLATFORM !== "macos" ? (
            <NavigationButton onPress={onPressCamera}>
              <Icon type="AntDesign" name="camera" style={{ fontSize: 22 }} />
            </NavigationButton>
          ) : null
        );
      }
    });
  }, [navigation]);

  const onClickSend = async () => {
    try {
      if (!satInput) {
        throw new Error(t("send.error.checkAmount"));
      }
      else if (!pubkeyInput) {
        throw new Error(t("send.error.missingPubkey"));
      }
      setSending(true);
      const result = await sendKeysendPaymentV2(
        pubkeyInput,
        Long.fromValue(Number.parseInt(satInput, 10)),
        await generateSecureRandom(32),
        JSON.parse(routehintsInput || "[]"),
        name,
        messageInput,
      );
      console.log(result);
      console.log("status", [result.status, result.failureReason]);
      if (result.status !== lnrpc.Payment.PaymentStatus.SUCCEEDED) {
        throw new Error(`${translatePaymentFailureReason(result.failureReason)}`);
      }
      toast(t("send.alert"));
      console.log("Payment request is " + result.paymentRequest);
      console.log(typeof result.paymentRequest);

      const transaction: ITransaction = {
        date: result.creationDate,
        description: t("send.msg"),
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

        hops: result.htlcs[0].route?.hops?.map((hop) => ({
          chanId: hop.chanId ?? null,
          chanCapacity: hop.chanCapacity ?? null,
          amtToForward: hop.amtToForward || Long.fromInt(0),
          amtToForwardMsat: hop.amtToForwardMsat || Long.fromInt(0),
          fee: hop.fee || Long.fromInt(0),
          feeMsat: hop.feeMsat || Long.fromInt(0),
          expiry: hop.expiry || null,
          pubKey: hop.pubKey || null,
        })) ?? [],
      };
      syncTransaction(transaction);
    } catch (e) {
      toast(e.message, undefined, "danger");
    }
    setSending(false);
  };

  const onPressQr = () => {
    Clipboard.setString(JSON.stringify(routehints));
    toast(t("qr.alert"));
  }

  const onPressCamera = () => {
    navigation.navigate("CameraFullScreen", {
      onRead: (data: any) => {
        try {
          const json = JSON.parse(data);
          setPubkeyInput(json.pubkey);
          setRoutehintsInput(json.routehints);
          console.log(data);
        } catch (e) {
          setPubkeyInput(data?.split("@")[0]);
          console.log(e.message);
        }
      },
    });
  };

  const formItems = [{
    key: "AMOUNT_SAT",
    title: t("form.amount.title"),
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
      title: t("form.pubkey.title"),
      component: (
        <Input
          testID="input-pubkey"
          value={pubkeyInput}
          onChangeText={setPubkeyInput}
          placeholder={t("form.pubkey.placeholder")}
        />
      )
    }, {
      key: "routehints",
      title: t("form.route.title"),
      component: (
        <Input
          testID="input-routehints"
          value={routehintsInput}
          onChangeText={setRoutehintsInput}
          placeholder={t("form.route.placeholder")}
        />
      )
    }, {
      key: "message",
      title: t("form.message.title"),
      component: (
        <Input
          testID="input-chatmessage"
          value={messageInput}
          onChangeText={setMessageInput}
          placeholder={t("form.message.placeholder")}
        />
      )
    },
  ];

  return (
    <KeyboardAwareScrollView style={{ flex: 1, backgroundColor: blixtTheme.dark }}>
      <View style={{ alignItems: "center" }}>
        <H1 style={{ marginTop: 10, marginBottom: 5 }}>Keysend - scan to pay</H1>
        {routehints.length > 0  &&
          <QrCode
            onPress={onPressQr}
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
          {t("dialog.msg1")}{"\n"}
          {t("dialog.msg2")}
        </Text>
        <Text>
          {t("dialog.msg3")}
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
              <Text>{t("send.title")}</Text>
            }
          </Button>
        ]}
      />
    </KeyboardAwareScrollView>
  );
}

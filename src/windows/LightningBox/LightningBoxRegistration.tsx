import React, { useState, useLayoutEffect, useEffect } from "react";

import {
  Body,
  Button,
  Icon,
  Text,
  Left,
  View,
  H1,
  H2,
  List,
  ListItem,
  Right,
  Spinner,
  CheckBox,
  Item,
  Label,
} from "native-base";

import Content from "../../components/Content";
import Container from "../../components/Container";
import { StackNavigationProp } from "@react-navigation/stack";
import { signMessageNodePubkey } from "../../lndmobile/wallet";
import { getUnixTime } from "date-fns";
import { bytesToHexString, stringToUint8Array, timeout, toast } from "../../utils";
import { useTranslation } from "react-i18next";
import { namespaces } from "../../i18n/i18n.constants";
import { NativeModules, Platform, StyleSheet } from "react-native";
import { useStoreActions, useStoreState } from "../../state/store";
import { Alert } from "../../utils/alert";
import Input from "../../components/Input";
import { generateSecureRandom } from "react-native-securerandom";
import { lnrpc } from "../../../proto/lightning";
import { LightningBoxStackParamList } from "./index";
import logger from "../../utils/log";
import { blixtTheme } from "../../native-base-theme/variables/commonColor";

const log = logger("LightningBoxRegistration");

async function signLightningBoxMessage(
  endpoint: string,
  data: any,
): Promise<[string, lnrpc.SignMessageResponse]> {
  const messageToSign = {
    nonce: bytesToHexString(await generateSecureRandom(16)),
    timestamp: Math.floor(Date.now() / 1000),
    endpoint,
    data,
  };
  log.i("Signing message", [messageToSign]);

  const messageToSignStr = JSON.stringify(messageToSign);

  const signMessageResult = await signMessageNodePubkey(stringToUint8Array(messageToSignStr));

  return [messageToSignStr, signMessageResult];
}

interface ILightningBoxProps {
  navigation: StackNavigationProp<LightningBoxStackParamList, "LightningBoxRegistration">;
}
export default function LightningBoxRegistration({ navigation }: ILightningBoxProps) {
  const lightningBoxServer = useStoreState((store) => store.settings.lightningBoxServer);
  const t = useTranslation(namespaces.lightningBox.manage).t;
  const tSettings = useTranslation(namespaces.settings.settings).t;

  const [loading, setLoading] = useState(false);
  const [lnboxIsEligible, setLnboxIsEligible] = useState<boolean | null>(null);
  const [lnboxNotEligibleReason, setLnboxNotEligibleReason] = useState<string | null>(null);
  const [name, setName] = useState("");
  const lightningBoxLnurlPayDesc = useStoreState(
    (store) => store.settings.lightningBoxLnurlPayDesc,
  );
  const [lnurlpDesc, setLnurlpDesc] = useState(lightningBoxLnurlPayDesc);
  const changeLightningBoxAddress = useStoreActions(
    (store) => store.settings.changeLightningBoxAddress,
  );
  const changeLightningBoxLnurlPayDesc = useStoreActions(
    (store) => store.settings.changeLightningBoxLnurlPayDesc,
  );

  useEffect(() => {
    (async () => {
      try {
        const [messageToSignStr, signMessageResult] = await signLightningBoxMessage(
          "/user/check-eligibility",
          {},
        );

        const request = {
          message: messageToSignStr,
          signature: signMessageResult.signature,
        };
        log.i("request", [request]);
        const result = await fetch(`${lightningBoxServer}/user/check-eligibility`, {
          method: "POST",
          body: JSON.stringify(request),
        });
        const json = await result.json();
        log.i("json", [json]);

        if (json.status === "OK") {
          setLnboxIsEligible(true);
        } else {
          if (json.code === "HAS_USER") {
            log.i("Has user");
            await changeLightningBoxAddress(json?.user?.lightningAddress);
            await changeLightningBoxLnurlPayDesc(lnurlpDesc);
            navigation.replace("LightningBoxInfo");
          } else {
            log.i("Not elligable");
            setLnboxIsEligible(false);
            setLnboxNotEligibleReason(json.reason ?? null);
          }
        }
      } catch (error: any) {
        toast("Error: " + error.message, undefined, "danger");
      }
    })();
  }, []);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerTitle: t("title"),
      headerBackTitle: t("buttons.back", { ns: namespaces.common }),
      headerShown: true,
    });
  }, [navigation]);

  const register = async () => {
    try {
      console.log("register");
      const [messageToSignStr, signMessageResult] = await signLightningBoxMessage(
        "/user/register",
        {
          name,
        },
      );

      const request = {
        message: messageToSignStr,
        signature: signMessageResult.signature,
      };
      setLoading(true);
      const result = await fetch(`${lightningBoxServer}/user/register`, {
        method: "POST",
        body: JSON.stringify(request),
      });
      const json = await result.json();
      log.i(JSON.stringify(json));
      if (json.status == "ERROR") {
        Alert.alert("Error", json.reason ?? "Unknown error");
        setLoading(false);
      } else {
        await changeLightningBoxAddress(json?.user?.lightningAddress);
        await changeLightningBoxLnurlPayDesc(lnurlpDesc);
        navigation.replace("LightningBoxInfo");
      }
    } catch (error) {
      console.error(error);
      toast("Error: " + error.message, undefined, "danger");
      setLoading(false);
    }
  };

  const restartNeeded = () => {
    const title = tSettings("bitcoinNetwork.restartDialog.title");
    const message = tSettings("bitcoinNetwork.restartDialog.msg");

    Alert.alert(title, message, [
      {
        style: "default",
        text: t("buttons.ok", { ns: namespaces.common }),
        onPress: async () => {
          try {
            await NativeModules.BlixtTor.stopTor();
            await NativeModules.LndMobile.stopLnd();
            await NativeModules.LndMobileTools.killLnd();
          } catch (e) {
            console.log(e);
          }
          NativeModules.LndMobileTools.restartApp();
        },
      },
    ]);
  };

  // Persistent services
  const persistentServicesEnabled = useStoreState(
    (store) => store.settings.persistentServicesEnabled,
  );
  const changePersistentServicesEnabled = useStoreActions(
    (store) => store.settings.changePersistentServicesEnabled,
  );
  const changePersistentServicesEnabledPress = async () => {
    if (persistentServicesEnabled) {
      return;
    }
    await changePersistentServicesEnabled(!persistentServicesEnabled);
    restartNeeded();
  };

  return (
    <Container>
      <Content>
        <H1>📥 Lightning Box</H1>
        <View style={{ marginTop: 10 }}>
          <Text style={style.p}>Welcome to the Lightning Box registration.</Text>
          <Text style={style.p}>
            Lightning Box is a Lightning Address service provider that forwards payment requests
            directly to the phone, giving you a self-custodial Lightning Address for mobile devices.
          </Text>
          <Text style={style.p}>
            This service is dependent on persistent mode, because the app must stay active to
            receive incoming payments. Please make sure that battery optimization is turned off on
            your device. Otherwise this service may not work.
          </Text>
          <Text style={style.p}>
            The service is free to use. However, due to technical reasons it currently requires a
            channel with the Lightning Box provider. It's currently not possible to change your
            Lightning Address after you have chosen one.
          </Text>
          {/* <Text style={style.p}>Follow the steps below in order to register your account.</Text> */}
        </View>
        <View style={style.prerequisites}>
          <H2>Prerequisites</H2>
          <List style={style.list}>
            <ListItem style={style.listItem} icon={true}>
              <Left>
                <Icon style={style.icon} type="Entypo" name="magnifying-glass" />
              </Left>
              <Body>
                {lnboxIsEligible == null && (
                  <Text>{/*t("prerequisites.eligibility")*/}Checking eligibility...</Text>
                )}
                {lnboxIsEligible === true && (
                  <>
                    <Text>Eligible</Text>
                    <Text note={true}>You have a channel with the Lightning Box service.</Text>
                  </>
                )}
                {lnboxIsEligible === false && (
                  <>
                    <Text>Not eligible</Text>
                    <Text note={true}>Reason: {lnboxNotEligibleReason}</Text>
                  </>
                )}
              </Body>
              <Right>
                {lnboxIsEligible !== null && (
                  <CheckBox disabled checked={lnboxIsEligible} onPress={undefined} />
                )}
              </Right>
            </ListItem>

            <ListItem
              style={style.listItem}
              icon={true}
              onPress={changePersistentServicesEnabledPress}
            >
              <Left>
                <Icon style={style.icon} type="Entypo" name="globe" />
              </Left>
              <Body>
                <Text>{tSettings("debug.persistentServices.title")}</Text>
                <Text note={true}>{tSettings("debug.persistentServices.subtitle")}</Text>
              </Body>
              <Right>
                <CheckBox
                  checked={persistentServicesEnabled}
                  onPress={changePersistentServicesEnabledPress}
                />
              </Right>
            </ListItem>
          </List>
        </View>

        <View style={style.prerequisites}>
          <H2>Registration</H2>
          <Item>
            <Label style={{ width: 95 }}>Address</Label>
            <Input
              autoCapitalize="none"
              secureTextEntry={true}
              keyboardType="visible-password"
              placeholder="user"
              value={name}
              onChangeText={(text) => setName(text.toLowerCase())}
              maxLength={16}
            />
            <Text>@blixtwallet.com</Text>
          </Item>
          <Item>
            <Label style={{ width: 95 }}>Message to the payer</Label>
            <Input value={lnurlpDesc} onChangeText={setLnurlpDesc} maxLength={64} />
          </Item>
          <Text></Text>
        </View>

        <Button
          onPress={register}
          testID="create-invoice"
          key="CREATE_INVOICE"
          block={true}
          primary={true}
          disabled={!(lnboxIsEligible && name && !loading)}
        >
          {loading ? <Spinner color={blixtTheme.light} /> : <Text>Register</Text>}
        </Button>
      </Content>
    </Container>
  );
}

const style = StyleSheet.create({
  p: {
    marginBottom: 8,
  },
  prerequisites: {
    marginTop: 10,
    marginBottom: 16,
  },
  list: {
    paddingTop: 16,
  },
  listItem: {
    paddingLeft: 2,
    paddingRight: 2,
  },
  icon: {
    fontSize: 22,
    ...Platform.select({
      web: {
        marginRight: 5,
      },
    }),
  },
});

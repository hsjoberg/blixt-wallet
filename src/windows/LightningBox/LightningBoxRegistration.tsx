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
import { bytesToHexString, stringToUint8Array, toast } from "../../utils";
import { useTranslation } from "react-i18next";
import { namespaces } from "../../i18n/i18n.constants";
import { Platform, StyleSheet } from "react-native";
import { useStoreActions, useStoreState } from "../../state/store";
import { Alert } from "../../utils/alert";
import Input from "../../components/Input";
import { generateSecureRandom } from "../../lndmobile/index";
import { LightningBoxStackParamList } from "./index";
import logger from "../../utils/log";
import { blixtTheme } from "../../native-base-theme/variables/commonColor";
import { signMessage, stopDaemon } from "react-native-turbo-lnd";
import { SignMessageResponse } from "react-native-turbo-lnd/protos/lightning_pb";
import NativeBlixtTools from "../../turbomodules/NativeBlixtTools";

const log = logger("LightningBoxRegistration");

async function signLightningBoxMessage(
  endpoint: string,
  data: any,
): Promise<[string, SignMessageResponse]> {
  const messageToSign = {
    nonce: bytesToHexString(await generateSecureRandom(16)),
    timestamp: Math.floor(Date.now() / 1000),
    endpoint,
    data,
  };
  log.i("Signing message", [messageToSign]);

  const messageToSignStr = JSON.stringify(messageToSign);

  const signMessageResult = await signMessage({
    msg: stringToUint8Array(messageToSignStr),
  });

  return [messageToSignStr, signMessageResult];
}

interface ILightningBoxProps {
  navigation: StackNavigationProp<LightningBoxStackParamList, "LightningBoxRegistration">;
}
export default function LightningBoxRegistration({ navigation }: ILightningBoxProps) {
  const lightningBoxServer = useStoreState((store) => store.settings.lightningBoxServer);
  const t = useTranslation(namespaces.lightningBox.registration).t;
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
        toast(
          t("msg.error", { ns: namespaces.common }) + ": " + error.message,
          undefined,
          "danger",
        );
      }
    })();
  }, []);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerTitle: t("generic.lightningBox", { ns: namespaces.common }),
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
    } catch (error: any) {
      console.error(error);
      toast(t("msg.error", { ns: namespaces.common }) + ": " + error.message, undefined, "danger");
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
            await stopDaemon({});
          } catch (e) {
            console.log(e);
          }
          NativeBlixtTools.restartApp();
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
        <H1>📥 {t("generic.lightningBox", { ns: namespaces.common })}</H1>
        <View style={{ marginTop: 10 }}>
          <Text style={style.p}>{t("info.welcome")}</Text>
          <Text style={style.p}>{t("info.whatIs")}</Text>
          <Text style={style.p}>{t("info.persistentMode")}</Text>
          <Text style={style.p}>{t("info.currentRules")}</Text>
          {/* <Text style={style.p}>Follow the steps below in order to register your account.</Text> */}
        </View>
        <View style={style.prerequisites}>
          <H2>{t("prerequisites.prerequisites")}</H2>
          <List style={style.list}>
            <ListItem style={style.listItem} icon={true}>
              <Left>
                <Icon style={style.icon} type="Entypo" name="magnifying-glass" />
              </Left>
              <Body>
                {lnboxIsEligible == null && <Text>{t("prerequisites.checkingEligibility")}</Text>}
                {lnboxIsEligible === true && (
                  <>
                    <Text>{t("prerequisites.eligible")}</Text>
                    <Text note={true}>{t("prerequisites.youHaveChannel")}</Text>
                  </>
                )}
                {lnboxIsEligible === false && (
                  <>
                    <Text>{t("prerequisites.notEligible")}</Text>
                    <Text note={true}>
                      {t("generic.reason", {
                        ns: namespaces.common,
                        reason: lnboxNotEligibleReason,
                      })}
                    </Text>
                  </>
                )}
              </Body>
              <Right>
                {lnboxIsEligible !== null && <CheckBox disabled checked={lnboxIsEligible} />}
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
          <H2>{t("registration.registration")}</H2>
          <Item>
            <Label style={{ width: 95 }}>{t("registration.fields.address")}</Label>
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
            <Label style={{ width: 95 }}>{t("registration.fields.messageToPayer")}</Label>
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
          {loading ? (
            <Spinner color={blixtTheme.light} />
          ) : (
            <Text>{t("registration.register")}</Text>
          )}
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

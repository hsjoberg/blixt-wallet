import React, { useState, useLayoutEffect } from "react";

import { Text, View, H1 } from "native-base";
import { Button } from "../../components/Button";
import Clipboard from "@react-native-clipboard/clipboard";

import Content from "../../components/Content";
import Container from "../../components/Container";
import { StackNavigationProp } from "@react-navigation/stack";
import { RootStackParamList } from "../../Main";
import { toast } from "../../utils";
import { useTranslation } from "react-i18next";
import { namespaces } from "../../i18n/i18n.constants";
import { useStoreActions, useStoreState } from "../../state/store";
import QrCode from "../../components/QrCode";
import CopyAddress from "../../components/CopyAddress";

interface ILightningBoxProps {
  navigation: StackNavigationProp<RootStackParamList, "LightningBox">;
}
export default function LightningBoxRegistration({ navigation }: ILightningBoxProps) {
  const t = useTranslation(namespaces.lightningBox.info).t;

  const lightningBoxAddress = useStoreState((store) => store.settings.lightningBoxAddress);
  // const lightningBoxLnurlPayDesc = useStoreState(
  //   (store) => store.settings.lightningBoxLnurlPayDesc,
  // );
  const changeLightningBoxAddress = useStoreActions(
    (store) => store.settings.changeLightningBoxAddress,
  );

  const [showQrCode, setShowQrCode] = useState(false);

  const onPressShowQrCode = () => {
    setShowQrCode(true);
  };

  useLayoutEffect(() => {
    navigation.setOptions({
      headerTitle: t("generic.lightningBox", { ns: namespaces.common }),
      headerBackTitle: t("buttons.back", { ns: namespaces.common }),
      headerShown: true,
    });
  }, [navigation]);

  const identifier = lightningBoxAddress.split("@")[0];
  const domain = lightningBoxAddress.split("@")[1];
  const lud17 = `lnurlp://${domain}/.well-known/lnurlp/${identifier}`;

  const onPressLightningAddress = () => {
    Clipboard.setString(lightningBoxAddress);
    toast(t("msg.clipboardCopy", { ns: namespaces.common }), undefined, "warning");
  };

  const onPressQrCode = () => {
    Clipboard.setString(lud17);
    toast(t("msg.clipboardCopy", { ns: namespaces.common }), undefined, "warning");
  };

  return (
    <Container>
      <Content centered>
        <H1 style={{ marginBottom: 10 }}>
          {t("generic.lightningAddress", { ns: namespaces.common })}
        </H1>

        <Text>{t("yourLightningAddress")}</Text>
        <View style={{ width: "89%", marginBottom: 16 }} testID="payment-request-string">
          <CopyAddress text={lightningBoxAddress} onPress={onPressLightningAddress} />
        </View>
        {/* <Text>Message to payer: {lightningBoxLnurlPayDesc}</Text> */}
        {showQrCode && <QrCode size={150} border={15} data={lud17} onPress={onPressQrCode} />}
        {!showQrCode && (
          <Button onPress={onPressShowQrCode}>
            <Text>{t("showQrCode")}</Text>
          </Button>
        )}
      </Content>
    </Container>
  );
}

import React, { useEffect } from "react";
import { StyleSheet, View, Share } from "react-native";
import { Body, Card, Text, CardItem, H1 } from "native-base";

import Blurmodal from "../../components/BlurModal";
import { useStoreState, useStoreActions } from "../../state/store";
import QrCode from "../../components/QrCode";
import { smallScreen } from "../../utils/device";
import CopyAddress from "../../components/CopyAddress";
import Clipboard from "@react-native-community/clipboard";
import { toast } from "../../utils";

import { useTranslation, TFunction } from "react-i18next";
import { namespaces } from "../../i18n/i18n.constants";

let t:TFunction;

export default function TorShowOnionAddress() {
  t = useTranslation(namespaces.settings.torShowOnionAddress).t;
  const nodeInfo = useStoreState((store) => store.lightning.nodeInfo);
  const getNodeInfo = useStoreActions((store) => store.lightning.getInfo);

  useEffect(() => {
    (async () => {
      await getNodeInfo();
    })();
  }, [getNodeInfo]);

  if (!nodeInfo) {
    return (<></>);
  }

  const onionService = nodeInfo?.uris ? nodeInfo?.uris[0] : null;

  const onQrPress = async () => {
    await Share.share({
      message: onionService ?? "",
    });
  };

  const onPaymentRequestTextPress = () => {
    Clipboard.setString(onionService ?? "");
    toast(t("msg.clipboardCopy",{ns:namespaces.common}), undefined, "warning");
  };

  return (
    <Blurmodal>
      <Card style={style.card}>
        <CardItem>
          <Body>
            <H1>
              {t("title")}
            </H1>
            {onionService &&
              <>
                <Text>{t("msg1")}.</Text>
                <View style={{ marginTop: 16, width: "100%", alignItems: "center", justifyContent: "center" }}>
                  {onionService &&
                    <QrCode size={smallScreen ? 220 : 280} data={onionService} onPress={onQrPress} border={25} />
                  }
                </View>
                <View style={{ alignItems: "center", justifyContent: "center" }}>
                  <CopyAddress text={onionService || ""} onPress={onPaymentRequestTextPress} />
                </View>
              </>
            }
            {!onionService &&
              <Text style={{ marginTop: 16 }}>{t("msg2")}</Text>
            }
          </Body>
        </CardItem>
      </Card>
    </Blurmodal>
  );
};

const style = StyleSheet.create({
  card: {
    padding: 5,
    width: "100%",
    // minHeight: "55%",
  },
  header: {
    width: "100%",
    fontWeight: "bold",
    marginBottom: 8,
  },
  detailText: {
    marginBottom: 7,
  },
  textBlock: {
    marginBottom: 8,
  },
  textBold: {
    fontWeight: "bold",
  }
});


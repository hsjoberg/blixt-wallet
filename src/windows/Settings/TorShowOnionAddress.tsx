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

export default function TorShowOnionAddress() {
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
    toast("Copied to clipboard", undefined, "warning");
  };

  return (
    <Blurmodal>
      <Card style={style.card}>
        <CardItem>
          <Body>
            <H1>
              Tor Onion Service
            </H1>
            {onionService &&
              <>
                <Text>Scan this QR code to open a channel to this wallet.</Text>
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
              <Text style={{ marginTop: 16 }}>Couldn't resolve onion address</Text>
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


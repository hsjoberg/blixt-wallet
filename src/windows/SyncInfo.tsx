import React, { useEffect, useRef, useState } from "react";
import { EmitterSubscription, NativeModules, StyleSheet, View } from "react-native";
import { Card, Text, CardItem, H1, Button } from "native-base";
import Clipboard from "@react-native-community/clipboard";
import Bar from "../components/ProgressBar";

import { useStoreState } from "../state/store";
import Blurmodal from "../components/BlurModal";
import TextLink from "../components/TextLink";
import { blixtTheme } from "../native-base-theme/variables/commonColor";
import { toast } from "../utils";
import { PLATFORM } from "../utils/constants";
import { ScrollView } from "react-native-gesture-handler";
import useForceUpdate from "../hooks/useForceUpdate";
import { LndMobileToolsEventEmitter } from "../utils/event-listener";
import LogBox from "../components/LogBox";

import { useTranslation } from "react-i18next";
import { namespaces } from "../i18n/i18n.constants";


interface IMetaDataProps {
  title: string;
  data: string;
  url?: string;
}
const MetaData = ({ title, data, url }: IMetaDataProps) => {
  const t = useTranslation(namespaces.syncInfo).t;

  return (
    <Text
      style={style.detailText}
      onPress={() => {
        Clipboard.setString(data);
        toast(t("msg.clipboardCopy",{ns:namespaces.common}), undefined, "warning");
      }}
    >
      <Text style={{ fontWeight: "bold" }}>{title}:{"\n"}</Text>
      {!url && data}
      {url && <TextLink url={url}>{data}</TextLink>}
    </Text>
  );
};

export interface ISyncInfoProps {}
export default function SyncInfo({}: ISyncInfoProps) {
  const t = useTranslation(namespaces.syncInfo).t;
  const nodeInfo = useStoreState((store) => store.lightning.nodeInfo);
  const recoverInfo = useStoreState((store) => store.lightning.recoverInfo);
  const initialKnownBlockheight = useStoreState((store) => store.lightning.initialKnownBlockheight);
  let bestBlockheight = useStoreState((store) => store.lightning.bestBlockheight);
  const log = useRef("");
  const forceUpdate = useForceUpdate();
  const [showLndLog, setShowLndLog] = useState(false);
  const listener = useRef<EmitterSubscription>();

  useEffect(() => {
    return () => {
      if (listener.current) {
        listener.current?.remove();
      }
    };
  }, []);

  const onPressShowLndLog = async () => {
    const tailLog = await NativeModules.LndMobileTools.tailLog(100);
    log.current = tailLog.split("\n").map((row) => row.slice(11)).join("\n");

    listener.current = LndMobileToolsEventEmitter.addListener("lndlog", function (data: string) {
      log.current = log.current + "\n" + data.slice(11);
      forceUpdate();
    });

    NativeModules.LndMobileTools.observeLndLogFile();
    forceUpdate();
    setShowLndLog(true);
  };

  const onPressCopy = (l: string) => {
    Clipboard.setString(l);
    toast(t("msg.clipboardCopy",{ns:namespaces.common}), undefined, "warning");
  }


  if (PLATFORM === "web") {
    bestBlockheight = 600000;
  }

  const currentProgress = (nodeInfo?.blockHeight ?? 0) - (initialKnownBlockheight ?? 0);
  const numBlocksUntilSynced = (bestBlockheight ?? 0) - (initialKnownBlockheight ?? 0);
  let progress = currentProgress / numBlocksUntilSynced;
  if (Number.isNaN(progress)) {
    progress = 1;
  }

  return (
    <Blurmodal>
      <Card style={style.card}>
        <CardItem>
          <ScrollView alwaysBounceVertical={false}>
            <H1 style={style.header}>
              {!nodeInfo?.syncedToChain ? t("syncedToChain.title") : t("syncedToChain.title1")}
            </H1>
            <Text style={{ marginBottom: 14 }}>
              {!nodeInfo?.syncedToChain
                ?
                  t("syncedToChain.msg1")+"\n\n" +
                  t("syncedToChain.msg2")
                :
                  t("syncedToChain.msg3")
              }
            </Text>
            <MetaData title={t("syncedToChain.blockHeight.title")} data={nodeInfo?.blockHeight?.toString() ?? "N/A"} />
            {nodeInfo?.syncedToChain === false && bestBlockheight !== undefined &&
              <>
                <Text style={[style.detailText, { fontWeight: "bold" }]}>
                  {t("syncedToChain.blockHeight.msg1")}:
                </Text>
                <View style={{ flexDirection: "row" }}>
                  <Bar
                    width={200}
                    style={{ marginTop: 3, marginLeft: 1, marginBottom: 12 }}
                    color={blixtTheme.primary}
                    progress={progress}
                  />
                  <Text style={{ marginTop: -5, marginLeft: 8 }}>
                    {(progress * 100).toFixed(0)}%
                  </Text>
                </View>
              </>
            }
            {nodeInfo?.syncedToChain === true &&
              <MetaData title={t("syncedToChain.blockHeight.msg1")} data={t("syncedToChain.title1")} />
            }

            {recoverInfo.recoveryMode && (
              <View>
                {!recoverInfo.recoveryFinished && (
                  <>
                    <Text style={[style.detailText, { fontWeight: "bold" }]}>{t("recoveryMode.title")}:</Text>
                    <View style={{ flexDirection: "row" }}>
                      <Bar
                        width={200}
                        style={{ marginTop: 3, marginLeft: 1, marginBottom: 12 }}
                        color={blixtTheme.primary}
                        progress={recoverInfo.progress}
                      />
                      <Text style={{ marginTop: -5, marginLeft: 8 }}>
                        {(recoverInfo.progress * 100).toFixed(0)}%
                      </Text>
                    </View>
                  </>
                )}
                {recoverInfo.recoveryFinished && (
                  <MetaData title={t("recoveryMode.title")} data={t("recoveryMode.msg1")+"\n"+t("recoveryMode.msg2")} />
                )}
              </View>
            )}
            {!showLndLog && (
              <View style={{ marginTop: 10, flexDirection: "row" }}>
                <Button small onPress={onPressShowLndLog}>
                  <Text>Show lnd log</Text>
                </Button>
              </View>
            )}
            {showLndLog && (
              <View style={{ marginTop: 10 }}>
                <LogBox text={log.current} style={{ maxHeight: 170 }} />
                <View style={{ marginTop: 10, flexDirection: "row" }}>
                  <Button small onPress={() => onPressCopy(log.current)}>
                    <Text>Copy log text</Text>
                  </Button>
                </View>
              </View>
            )}
          </ScrollView>
        </CardItem>
      </Card>
    </Blurmodal>
  );
};

const style = StyleSheet.create({
  card: {
    padding: 5,
    width: "100%",
    minHeight: "40%",
  },
  header: {
    fontWeight: "bold",
    marginBottom: 10,
  },
  detailText: {
    marginBottom: 7,
  },
  qrText: {
    marginBottom: 7,
    paddingTop: 4,
    paddingLeft: 18,
    paddingRight: 18,
  }
});

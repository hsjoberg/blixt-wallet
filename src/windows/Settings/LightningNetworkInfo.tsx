import React, { useEffect } from "react";
import { StyleSheet, ScrollView, Platform } from "react-native";
import Clipboard from "@react-native-clipboard/clipboard";
import { Body, Card, Text, CardItem, H1 } from "native-base";

import Blurmodal from "../../components/BlurModal";
import { toast } from "../../utils";
import { useStoreState, useStoreActions } from "../../state/store";

import { useTranslation } from "react-i18next";
import { namespaces } from "../../i18n/i18n.constants";

interface IMetaDataProps {
  title: string;
  data: string | string[] | number;
}
const MetaData = ({ title, data }: IMetaDataProps) => {
  const { t } = useTranslation(namespaces.settings.lightningNetworkInfo);

  return (
    <Text
      style={style.detailText}
      onPress={() => {
        Array.isArray(data)
          ? Clipboard.setString(data.join("\n"))
          : Clipboard.setString(data.toString());
        toast(t("msg.clipboardCopy", { ns: namespaces.common }), undefined, "warning");
      }}
    >
      <Text style={{ fontWeight: "bold" }}>
        {title}:{"\n"}
      </Text>
      {Array.isArray(data) && data.join("\n")}
      {!Array.isArray(data) && data}
    </Text>
  );
};

export default function LightningNetworkInfo() {
  const { t } = useTranslation(namespaces.settings.lightningNetworkInfo);

  const getNetworkInfo = useStoreActions((store) => store.lightning.getNetworkInfo);
  const networkInfo = useStoreState((store) => store.lightning.networkInfo);

  useEffect(() => {
    (async () => {
      await getNetworkInfo();
    })();
  }, [getNetworkInfo]);

  if (!networkInfo) {
    return <></>;
  }

  return (
    <Blurmodal>
      <Card style={style.card}>
        <CardItem>
          <Body>
            <ScrollView>
              <H1 style={style.header}>{t("title")}</H1>
              <MetaData title={t("numNodes")} data={networkInfo.numNodes} />
              <MetaData title={t("numChannels")} data={networkInfo.numChannels} />
              <MetaData title={t("numZombieChans")} data={networkInfo.numZombieChans.toString()} />
            </ScrollView>
          </Body>
        </CardItem>
      </Card>
    </Blurmodal>
  );
}

const style = StyleSheet.create({
  card: {
    padding: 5,
    width: "100%",
    minHeight: "38%",
    maxHeight: "86%",
  },
  header: {
    width: "100%",
    fontWeight: "bold",
    marginBottom: 8,
  },
  detailText: {
    marginBottom: 7,
    ...Platform.select({
      web: {
        wordBreak: "break-all",
      },
    }),
  },
});

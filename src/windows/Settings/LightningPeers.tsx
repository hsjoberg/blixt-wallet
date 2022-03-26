import React, { useEffect, useLayoutEffect, useState } from "react";
import { Image, StyleSheet, View } from "react-native";
import { Body, Button, Card, CardItem, Fab, Icon, Left, Right, Row, Text, Spinner } from "native-base";
import { StackNavigationProp } from "@react-navigation/stack";
import { RouteProp } from "@react-navigation/native";
import Long from "long";

import Container from "../../components/Container";
import BlixtContent from "../../components/Content";
import { useStoreActions, useStoreState } from "../../state/store";
import { NavigationButton } from "../../components/NavigationButton";
import { identifyService, lightningServices } from "../../utils/lightning-services";
import { SettingsStackParamList } from "./index";
import { lnrpc } from "../../../proto/lightning";
import { blixtTheme } from "../../native-base-theme/variables/commonColor";

import { useTranslation } from "react-i18next";
import { namespaces } from "../../i18n/i18n.constants";

export interface ISelectListProps {
  navigation: StackNavigationProp<SettingsStackParamList, "LightningPeers">;
  route: RouteProp<SettingsStackParamList, "LightningPeers">;
}

export default function({ navigation }: ISelectListProps) {
  const t = useTranslation(namespaces.settings.lightningPeers).t;
  const rpcReady = useStoreState((store) => store.lightning.rpcReady);
  const syncedToChain = useStoreState((store) => store.lightning.syncedToChain);
  const lightningPeers = useStoreState((store) => store.lightning.lightningPeers);
  const getLightningPeers = useStoreActions((store) => store.lightning.getLightningPeers);
  const disconnectPeer = useStoreActions((store) => store.lightning.disconnectPeer);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (rpcReady && syncedToChain) {
      (async () => {
        setLoading(true);
        await getLightningPeers();
        setLoading(false);
      })();
    }
  }, [getLightningPeers, rpcReady, syncedToChain]);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerTitle: t("layout.title"),
      headerShown: true,
      headerRight: () => {
        return (
          <NavigationButton onPress={async () => rpcReady && await getLightningPeers()}>
            <Icon type="MaterialIcons" name="sync" style={{ fontSize: 22 }} />
          </NavigationButton>
        )
      }
    });
  }, [navigation]);

  const close = async (pubkey: string) => {
    await disconnectPeer(pubkey);
    await getLightningPeers();
  };

  return (
    <Container>
      {(loading && lightningPeers.length === 0) &&
        <View style={style.loadingContainer}>
          <Spinner color={blixtTheme.light} size={55} />
        </View>
      }
      {!loading &&
        <>
          <BlixtContent style={{ paddingBottom: 25 }}>
            {lightningPeers.map((peer) => {
              const serviceKey = identifyService(peer.peer.pubKey, "", null);
              let service;
              if (serviceKey && lightningServices[serviceKey]) {
                service = lightningServices[serviceKey];
              }

              return (
                <Card style={style.card} key={peer.peer.pubKey}>
                  <CardItem>
                    <Body>
                      <Row style={{ width: "100%" }}>
                        <Left style={{ alignSelf: "flex-start" }}>
                          <Text>{t("alias")}</Text>
                        </Left>
                        <Right style={{ flexDirection: "row", alignItems: "flex-start", justifyContent: "flex-end" }}>
                          <Text style={style.cardDataText}>
                            {peer.node?.alias}
                          </Text>
                          {service &&
                            <Image
                              source={{ uri: service.image }}
                              style={style.nodeImage}
                              width={28}
                              height={28}
                            />
                          }
                        </Right>
                      </Row>
                      <Row style={{ width: "100%" }}>
                        <Left style={{ alignSelf: "flex-start" }}>
                          <Text>{t("pubKey")}</Text>
                        </Left>
                        <Right>
                          <Text style={{ fontSize: 9, textAlign:"right" }}>{peer.peer.pubKey}</Text>
                        </Right>
                      </Row>
                      <Row style={{ width: "100%" }}>
                        <Left style={{ alignSelf: "flex-start" }}>
                          <Text>{t("address")}</Text>
                        </Left>
                        <Right>
                        <Text style={style.cardDataText}>{peer.peer.address}</Text>
                        </Right>
                      </Row>
                      <Row style={{ width: "100%" }}>
                        <Left style={{ alignSelf: "flex-start" }}>
                          <Text>{t("data.title")}</Text>
                        </Left>
                        <Right>
                          <Text style={style.cardDataText}>
                            {Long.fromValue(peer.peer.bytesSent).toString()} {t("data.bytesSent")}{"\n"}
                            {Long.fromValue(peer.peer.bytesRecv).toString()} {t("data.bytesRecv")}
                          </Text>
                        </Right>
                      </Row>
                      <Row style={{ width: "100%" }}>
                        <Left style={{ alignSelf: "flex-start" }}>
                          <Text>{t("transfer.title")}</Text>
                        </Left>
                        <Right>
                          <Text style={style.cardDataText}>
                            {Long.fromValue(peer.peer.satSent).toString()} {t("transfer.satSent")}{"\n"}
                            {Long.fromValue(peer.peer.satRecv).toString()} {t("transfer.satRecv")}
                          </Text>
                        </Right>
                      </Row>
                      <Row style={{ width: "100%" }}>
                        <Left style={{ alignSelf: "flex-start" }}>
                          <Text>{t("inbound")}</Text>
                        </Left>
                        <Right>
                          <Text style={style.cardDataText}>
                            {peer.peer.inbound ? "true" : "false"}
                          </Text>
                        </Right>
                      </Row>
                      {/* <Row style={{ width: "100%" }}>
                        <Left style={{ alignSelf: "flex-start" }}>
                          <Text>Ping time</Text>
                        </Left>
                        <Right>
                          <Text style={style.cardDataText}>
                            {Long.fromValue(peer.peer.pingTime).divtoString()}
                          </Text>
                        </Right>
                      </Row> */}
                      <Row style={{ width: "100%" }}>
                        <Left style={{ alignSelf: "flex-start" }}>
                          <Text>{t("syncType")}</Text>
                        </Left>
                        <Right>
                          <Text style={style.cardDataText}>
                            {getPeerSyncType(peer.peer.syncType)}
                          </Text>
                        </Right>
                      </Row>
                      {peer.peer.errors.length > 0 &&
                        <Row style={{ width: "100%" }}>
                          <Left style={{ alignSelf: "flex-start" }}>
                            <Text>{t("errors")}</Text>
                          </Left>
                          <Right>
                            <Text style={style.cardDataText}>
                              {(peer.peer.errors.map((error, i) => (
                                <Text key={`${i}${error.error}`}>
                                  {error.error}{"\n"}
                                </Text>
                              )))}
                            </Text>
                          </Right>
                        </Row>
                      }
                      <Row style={{ width: "100%" }}>
                        <Left>
                          <Button style={{ marginTop: 14 }} primary={true} small={true} onPress={() => close(peer.peer.pubKey)}>
                            <Text style={{fontSize: 9}}>{t("disconnect")}</Text>
                          </Button>
                        </Left>
                      </Row>
                    </Body>
                  </CardItem>
                </Card>
              );
            })}
          </BlixtContent>
          <Fab
            style={style.fab}
            position="bottomRight"
            onPress={() => navigation.navigate("ConnectToLightningPeer")}>
            <Icon type="Entypo" name="plus" style={style.fabConnectToPerIcon} />
          </Fab>
        </>
      }
    </Container>
  )
}

const style = StyleSheet.create({
  nodeImage: {
    borderRadius: 22,
    marginLeft: 10,
    marginTop: -2.5,
    marginBottom: 4,
  },
  card: {
    width: "100%",
    marginTop: 8,
  },
  cardDataText: {
    textAlign: "right",
  },
  fab: {
    backgroundColor: blixtTheme.primary,
  },
  fabConnectToPerIcon: {
    color: blixtTheme.light,
  },
  loadingContainer: {
    flex: 1,
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
})

function getPeerSyncType(type: lnrpc.Peer.SyncType) {
  if (type === lnrpc.Peer.SyncType.UNKNOWN_SYNC) {
    return "UNKNOWN_SYNC"
  } else if (type === lnrpc.Peer.SyncType.ACTIVE_SYNC) {
    return "ACTIVE_SYNC"
  } else if (type === lnrpc.Peer.SyncType.PASSIVE_SYNC) {
    return "PASSIVE_SYNC"
  }
  return "UNKNOWN";
}

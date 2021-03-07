import React, { useEffect, useLayoutEffect } from "react";
import { Body, Button, Card, CardItem, Fab, Icon, Left, Right, Row, Text } from "native-base";
import { Image, StyleSheet } from "react-native";
import { StackNavigationProp } from "@react-navigation/stack";
import { RouteProp } from "@react-navigation/native";
import Long from "long";

import Container from "../../components/Container";
import BlixtContent from "../../components/Content";
import { useStoreActions, useStoreState } from "../../state/store";
import { NavigationButton } from "../../components/NavigationButton";
import { identifyService, lightningServices } from "../../utils/lightning-services";
import { timeout } from "../../utils";
import { SettingsStackParamList } from "./index";
import { lnrpc } from "../../../proto/proto";
import { blixtTheme } from "../../native-base-theme/variables/commonColor";

export interface ISelectListProps {
  navigation: StackNavigationProp<SettingsStackParamList, "LightningPeers">;
  route: RouteProp<SettingsStackParamList, "LightningPeers">;
}

export default function({ navigation }: ISelectListProps) {
  const rpcReady = useStoreState((store) => store.lightning.rpcReady);
  const syncedToChain = useStoreState((store) => store.lightning.syncedToChain);
  const lightningPeers = useStoreState((store) => store.lightning.lightningPeers);
  const getLightningPeers = useStoreActions((store) => store.lightning.getLightningPeers);
  const disconnectPeer = useStoreActions((store) => store.lightning.disconnectPeer);

  useEffect(() => {
    console.log("useeffect");
    if (rpcReady && syncedToChain) {
      (async () => {
        await timeout(2000)
        await getLightningPeers();
      })();
    }
  }, [getLightningPeers, rpcReady, syncedToChain]);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerTitle: "Lightning Peers",
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
                      <Text>Node alias</Text>
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
                      <Text>Node public key</Text>
                    </Left>
                    <Right>
                      <Text style={{ fontSize: 9, textAlign:"right" }}>{peer.peer.pubKey}</Text>
                    </Right>
                  </Row>
                  <Row style={{ width: "100%" }}>
                    <Left style={{ alignSelf: "flex-start" }}>
                      <Text>Node address</Text>
                    </Left>
                    <Right>
                    <Text style={style.cardDataText}>{peer.peer.address}</Text>
                    </Right>
                  </Row>
                  <Row style={{ width: "100%" }}>
                    <Left style={{ alignSelf: "flex-start" }}>
                      <Text>Data</Text>
                    </Left>
                    <Right>
                      <Text style={style.cardDataText}>
                        {Long.fromValue(peer.peer.bytesSent).toString()} bytes sent{"\n"}
                        {Long.fromValue(peer.peer.bytesSent).toString()} byes received
                      </Text>
                    </Right>
                  </Row>
                  <Row style={{ width: "100%" }}>
                    <Left style={{ alignSelf: "flex-start" }}>
                      <Text>Transfer</Text>
                    </Left>
                    <Right>
                      <Text style={style.cardDataText}>
                        {Long.fromValue(peer.peer.satSent).toString()} sat sent{"\n"}
                        {Long.fromValue(peer.peer.satRecv).toString()} sat received
                      </Text>
                    </Right>
                  </Row>
                  <Row style={{ width: "100%" }}>
                    <Left style={{ alignSelf: "flex-start" }}>
                      <Text>Inbound</Text>
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
                      <Text>Sync type</Text>
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
                        <Text>Errors</Text>
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
                        <Text style={{fontSize: 9}}>Disconnect peer</Text>
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

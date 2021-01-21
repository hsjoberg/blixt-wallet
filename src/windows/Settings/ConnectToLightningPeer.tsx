import React, { useState, useLayoutEffect } from "react";
import { Text, Container, Button, Icon, Input, Spinner } from "native-base";
import { StackNavigationProp } from "@react-navigation/stack";

import { SettingsStackParamList } from "./index";
import { useStoreActions } from "../../state/store";
import BlixtForm from "../../components/Form";
import { blixtTheme } from "../../native-base-theme/variables/commonColor";
import { RouteProp } from "@react-navigation/native";
import { toast } from "../../utils";

export interface IConnectToLightningPeerProps {
  navigation: StackNavigationProp<SettingsStackParamList, "LightningPeers">;
  route: RouteProp<SettingsStackParamList, "LightningPeers">;
}

export default function OpenChannel({ navigation, route }: IConnectToLightningPeerProps) {
  const connectPeer = useStoreActions((store) => store.lightning.connectPeer);
  const getLightningPeers = useStoreActions((store) => store.lightning.getLightningPeers);
  const [peer, setPeer] = useState("");
  const [connecting, setConnecting] = useState(false);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerTitle: "Connect to Lightning Peer",
      headerShown: true,
    });
  }, [navigation]);

  const onConnectPress = async () => {
    try {
      setConnecting(true);
      await connectPeer(peer);
      await getLightningPeers();
      navigation.pop();
    } catch (e) {
      toast(`Error: ${e.message}`, 12000, "danger", "Okay");
      setConnecting(false);
    }
  };

  const onCameraPress = () => {
    navigation.navigate("CameraFullscreen", {
      onRead: setPeer,
    });
  };

  return (
    <Container>
      <BlixtForm
        items={[{
          key: "NODE",
          title: "Node URI",
          component: (
            <>
              <Input placeholder="Peer URI" value={peer} onChangeText={setPeer} />
              <Icon type="AntDesign" name="camera" onPress={onCameraPress} />
            </>
          )
        },]}
        buttons={[
          <Button key="CONNECT_TO_NODE" onPress={onConnectPress} block={true} primary={true} disabled={connecting}>
            {!connecting && <Text>Connect</Text>}
            {connecting && <Spinner color={blixtTheme.light} />}
          </Button>
        ]}
      />
    </Container>
  );
};

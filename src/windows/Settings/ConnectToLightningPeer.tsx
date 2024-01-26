import React, { useState, useLayoutEffect } from "react";
import { Text, Container, Button, Icon, Spinner } from "native-base";
import { StackNavigationProp } from "@react-navigation/stack";
import { useTranslation } from "react-i18next";

import { SettingsStackParamList } from "./index";
import { useStoreActions } from "../../state/store";
import BlixtForm from "../../components/Form";
import { blixtTheme } from "../../native-base-theme/variables/commonColor";
import { RouteProp } from "@react-navigation/native";
import { toast } from "../../utils";
import { PLATFORM } from "../../utils/constants";
import { namespaces } from "../../i18n/i18n.constants";
import Input from "../../components/Input";

export interface IConnectToLightningPeerProps {
  navigation: StackNavigationProp<SettingsStackParamList, "LightningPeers">;
  route: RouteProp<SettingsStackParamList, "LightningPeers">;
}

export default function OpenChannel({ navigation, route }: IConnectToLightningPeerProps) {
  const { t } = useTranslation(namespaces.settings.connectToLightningPeer);
  const connectPeer = useStoreActions((store) => store.lightning.connectPeer);
  const getLightningPeers = useStoreActions((store) => store.lightning.getLightningPeers);
  const [peer, setPeer] = useState("");
  const [connecting, setConnecting] = useState(false);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerTitle: t("layout.title"),
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
      toast(`${t("msg.error", { ns: namespaces.common })}: ${e.message}`, 12000, "danger", "Okay");
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
        items={[
          {
            key: "NODE",
            title: t("connect.title"),
            component: (
              <>
                <Input placeholder={t("connect.placeholder")} value={peer} onChangeText={setPeer} />
                {PLATFORM !== "macos" && (
                  <Icon type="AntDesign" name="camera" onPress={onCameraPress} />
                )}
              </>
            ),
          },
        ]}
        buttons={[
          <Button
            key="CONNECT_TO_NODE"
            onPress={onConnectPress}
            block={true}
            primary={true}
            disabled={connecting}
          >
            {!connecting && <Text>{t("connect.accept")}</Text>}
            {connecting && <Spinner color={blixtTheme.light} />}
          </Button>,
        ]}
      />
    </Container>
  );
}

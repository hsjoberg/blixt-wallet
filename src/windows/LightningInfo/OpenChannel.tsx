import React, { useState, useLayoutEffect } from "react";
import { Body, Text, Header, Container, Left, Button, Title, Icon, Input, Spinner } from "native-base";
import { StackNavigationProp } from "@react-navigation/stack";

import { LightningInfoStackParamList } from "./index";
import { useStoreActions } from "../../state/store";
import BlixtForm from "../../components/Form";
import { blixtTheme } from "../../../native-base-theme/variables/commonColor";
import useBalance from "../../hooks/useBalance";
import { RouteProp } from "@react-navigation/native";
import { toast } from "../../utils";
import { TouchableWithoutFeedback } from "react-native";

export interface IOpenChannelProps {
  navigation: StackNavigationProp<LightningInfoStackParamList, "OpenChannel">;
  route: RouteProp<LightningInfoStackParamList, "OpenChannel">;
}
export default function OpenChannel({ navigation, route }: IOpenChannelProps) {
  const peerUri = route.params?.peerUri;
  const connectAndOpenChannel = useStoreActions((actions) => actions.channel.connectAndOpenChannel);
  const getChannels = useStoreActions((actions) => actions.channel.getChannels);
  const [peer, setPeer] = useState(peerUri ?? "");
  const [opening, setOpening] = useState(false);
  const {
    dollarValue,
    bitcoinValue,
    satoshiValue,
    onChangeFiatInput,
    onChangeBitcoinInput,
    bitcoinUnit,
    fiatUnit,
  } = useBalance();

  useLayoutEffect(() => {
    navigation.setOptions({
      headerTitle: "Open channel",
      headerShown: true,
    });
  }, [navigation]);

  const onOpenChannelPress = async () => {
    try {
      setOpening(true);
      await connectAndOpenChannel({
        peer,
        amount: satoshiValue,
      });
      await getChannels(undefined);
      navigation.pop();
    } catch (e) {
      toast(`Error: ${e.message}`, 12000, "danger", "Okay");
      setOpening(false);
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
          key: "CHANNEL",
          title: "Channel URI",
          component: (
            <>
              <Input placeholder="Channel" value={peer} onChangeText={setPeer} />
              <Icon type="AntDesign" name="camera" onPress={onCameraPress} />
            </>
          )
        }, {
          key: "AMOUNT",
          title: `Amount ${bitcoinUnit.nice}`,
          component: (<Input placeholder={`Amount ${bitcoinUnit.nice}`} keyboardType="numeric" onChangeText={onChangeBitcoinInput} value={bitcoinValue} />)
        }, {
          key: "AMOUNT_FIAT",
          title: `Amount ${fiatUnit}`,
          component: (<Input placeholder={`Amount ${fiatUnit}`} keyboardType="numeric" onChangeText={onChangeFiatInput} value={dollarValue} />)
        }]}
        buttons={[
          <Button key="OPEN_CHANNEL" onPress={onOpenChannelPress} block={true} primary={true} disabled={opening}>
            {!opening && <Text>Open channel</Text>}
            {opening && <Spinner color={blixtTheme.light} />}
          </Button>
        ]}
      />
    </Container>
  );
};

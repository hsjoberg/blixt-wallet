import React, { useState } from "react";
import { Body, Text, Header, Container, Left, Button, Title, Icon, Input, Toast, Spinner } from "native-base";
import { StackNavigationProp } from "@react-navigation/stack";

import { LightningInfoStackParamList } from "./index";
import { useStoreActions, useStoreState } from "../../state/store";
import BlixtForm from "../../components/Form";
import { blixtTheme } from "../../../native-base-theme/variables/commonColor";
import useBalance from "../../hooks/useBalance";

export interface IOpenChannelProps {
  navigation: StackNavigationProp<LightningInfoStackParamList, "LightningInfo">;
}
export default function OpenChannel({ navigation }: IOpenChannelProps) {
  const connectAndOpenChannel = useStoreActions((actions) => actions.channel.connectAndOpenChannel);
  const getChannels = useStoreActions((actions) => actions.channel.getChannels);
  const [peer, setPeer] = useState("");
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
      Toast.show({
        duration: 12000,
        type: "danger",
        text: `Error: ${e.message}`,
        buttonText: "Okay",
      });
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
      <Header iosBarStyle="light-content" translucent={false}>
        <Left>
          <Button transparent={true} onPress={() => navigation.pop()}>
            <Icon name="arrow-back" />
          </Button>
        </Left>
        <Body>
          <Title>Open channel</Title>
        </Body>
      </Header>
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
          <Button key="OPEN_CHANNEL" onPress={onOpenChannelPress} block={true} primary={true}>
            {!opening && <Text>Open channel</Text>}
            {opening && <Spinner color={blixtTheme.light} />}
          </Button>
        ]}
      />
    </Container>
  );
};

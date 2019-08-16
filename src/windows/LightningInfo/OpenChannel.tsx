import React, { useState } from "react";
import { Body, Text, Header, Container, Left, Button, Title, Icon, Input, Toast, Spinner } from "native-base";
import { NavigationScreenProp } from "react-navigation";

import { useStoreActions, useStoreState } from "../../state/store";
import BlixtForm from "../../components/Form";
import { blixtTheme } from "../../../native-base-theme/variables/commonColor";
import { unitToSatoshi } from "../../utils";
import { BitcoinUnitAlias } from "../../state/Settings";

export interface IOpenChannelProps {
  navigation: NavigationScreenProp<{}>;
}
export default ({ navigation }: IOpenChannelProps) => {
  const connectAndOpenChannel = useStoreActions((actions) => actions.channel.connectAndOpenChannel);
  const getChannels = useStoreActions((actions) => actions.channel.getChannels);
  const [peer, setPeer] = useState("");
  const [sat, setSat] = useState("");
  const [opening, setOpening] = useState(false);
  const bitcoinUnit = useStoreState((store) => store.settings.bitcoinUnit);

  const onOpenChannelPress = async () => {
    try {
      setOpening(true);
      const result = await connectAndOpenChannel({
        peer,
        amount: unitToSatoshi(Number.parseFloat(sat || "0"), bitcoinUnit),
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
          title: `Amount ${BitcoinUnitAlias[bitcoinUnit].nice}`,
          component: (<Input placeholder={`Amount ${BitcoinUnitAlias[bitcoinUnit].nice}`} keyboardType="numeric" onChangeText={setSat} value={sat} />)
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

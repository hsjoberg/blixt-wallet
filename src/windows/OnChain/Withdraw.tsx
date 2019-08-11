import React, { useState } from "react";
import { Body, Text, Header, Container, Left, Button, Title, Icon, Input, Toast, Spinner } from "native-base";
import { NavigationScreenProp } from "react-navigation";

import { useStoreActions } from "../../state/store";
import BlixtForm from "../../components/Form";
import Camera from "../../components/Camera";
import { blixtTheme } from "../../../native-base-theme/variables/commonColor";
import { parseBech32 } from "../../utils";

export interface IOpenChannelProps {
  navigation: NavigationScreenProp<{}>;
}
export default ({ navigation }: IOpenChannelProps) => {
  const sendCoins = useStoreActions((actions) => actions.onChain.sendCoins);
  const sendCoinsAll = useStoreActions((actions) => actions.onChain.sendCoinsAll);
  const getBalance = useStoreActions((actions) => actions.onChain.getBalance);
  const [address, setAddress] = useState("");
  const [sat, setSat] = useState("");
  const [sending, setSending] = useState(false);
  const [camera, setCamera] = useState(false);
  const [withdrawAll, setWithdrawAll] = useState(false);

  const onWithdrawClick = async () => {
    try {
      setSending(true);
      let result;
      if (withdrawAll) {
        result = await sendCoinsAll({ address });
      }
      else {
        result = await sendCoins({ address, sat: Number.parseInt(sat, 10)});
      }
      console.log(result);
      await getBalance(undefined);
      navigation.pop();

      Toast.show({
        duration: 6000,
        type: "success",
        text: "Withdraw succeeded",
        buttonText: "Okay",
      });
    } catch (e) {
      Toast.show({
        duration: 12000,
        type: "danger",
        text: `Error: ${e.message}`,
        buttonText: "Okay",
      });
      setSending(false);
    }
  };

  const onAddressChange = (text: string) => {
    const parsed = parseBech32(text);
    setAddress(parsed.address);
    if (parsed.amount) {
      const s = parsed.amount * 100000000;
      setSat(s.toString());
    }
  };

  const onCameraPress = () => {
    navigation.navigate("CameraFullscreen", {
      onRead: onAddressChange,
    });
  };

  const onWithdrawAllPress = () => {
    setSat("Withdraw all funds");
    setWithdrawAll(true);
  };

  const onCancelWithdrawAllPress = () => {
    setSat("");
    setWithdrawAll(false);
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
          <Title>Withdraw coins</Title>
        </Body>
      </Header>
      <BlixtForm
        items={[{
          key: "BTC_ADDRESS",
          title: "Address",
          component: (
            <>
              <Input placeholder="Bitcoin address" value={address} onChangeText={onAddressChange} />
              <Icon type="AntDesign" name="camera" onPress={onCameraPress} />
            </>
          ),
        }, {
          key: "AMOUNT",
          title: "Amount",
          component: (
            <>
              <Input placeholder="Amount (satoshi)" keyboardType="numeric" onChangeText={setSat} value={withdrawAll ? "Withdraw all funds" : sat} disabled={withdrawAll} />
              {!withdrawAll
                ? <Button onPress={onWithdrawAllPress} style={{ marginRight: 5 }} small={true}><Text>All</Text></Button>
                : <Button onPress={onCancelWithdrawAllPress} style={{ marginRight: 5 }} small={true}><Text>x</Text></Button>
              }
            </>
          ),
        }]}
        buttons={[
          <Button key="WITHDRAW" onPress={onWithdrawClick} block={true} primary={true}>
            {!sending && <Text>Withdraw</Text>}
            {sending && <Spinner color={blixtTheme.light} />}
          </Button>
        ]}
      />
    </Container>
  );
};

import React, { useState } from "react";
import { Body, Text, Header, Container, Left, Button, Title, Icon, Input, Toast, Spinner } from "native-base";
import { StackNavigationProp } from "@react-navigation/stack";

import { OnChainStackParamList } from "./index";
import { useStoreActions, useStoreState } from "../../state/store";
import BlixtForm from "../../components/Form";
import { blixtTheme } from "../../../native-base-theme/variables/commonColor";
import { parseBech32 } from "../../utils";
import { unitToSatoshi, BitcoinUnits, convertBitcoinUnit } from "../../utils/bitcoin-units";

export interface IOpenChannelProps {
  navigation: StackNavigationProp<OnChainStackParamList, "Withdraw">;
}
export default ({ navigation }: IOpenChannelProps) => {
  const sendCoins = useStoreActions((actions) => actions.onChain.sendCoins);
  const sendCoinsAll = useStoreActions((actions) => actions.onChain.sendCoinsAll);
  const getBalance = useStoreActions((actions) => actions.onChain.getBalance);
  const [address, setAddress] = useState("");
  const [sat, setSat] = useState("");
  const [sending, setSending] = useState(false);
  const [withdrawAll, setWithdrawAll] = useState(false);
  const bitcoinUnit = useStoreState((store) => store.settings.bitcoinUnit);

  const onWithdrawClick = async () => {
    try {
      setSending(true);
      let result;
      if (withdrawAll) {
        result = await sendCoinsAll({ address });
      }
      else {
        result = await sendCoins({
          address,
          sat: unitToSatoshi(Number.parseFloat(sat || "0"), bitcoinUnit),
        });
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
      const s = convertBitcoinUnit(parsed.amount, "bitcoin", bitcoinUnit); // TODO test
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
              <Input testID="INPUT_BITCOIN_ADDRESS" placeholder="Bitcoin address" value={address} onChangeText={onAddressChange} />
              <Icon type="AntDesign" name="camera" onPress={onCameraPress} />
            </>
          ),
        }, {
          key: "AMOUNT",
          title: `Amount ${BitcoinUnits[bitcoinUnit].nice}`,
          component: (
            <>
              <Input testID="INPUT_AMOUNT" placeholder={`Amount ${BitcoinUnits[bitcoinUnit].nice}`} keyboardType="numeric" onChangeText={setSat} value={withdrawAll ? "Withdraw all funds" : sat} disabled={withdrawAll} />
              {!withdrawAll
                ? <Button onPress={onWithdrawAllPress} style={{ marginRight: 5 }} small={true}><Text>All</Text></Button>
                : <Button onPress={onCancelWithdrawAllPress} style={{ marginRight: 5 }} small={true}><Text>x</Text></Button>
              }
            </>
          ),
        }]}
        buttons={[
          <Button
            testID="SEND_COINS"
            key="WITHDRAW"
            block={true}
            primary={true}
            onPress={onWithdrawClick}
            disabled={sending}
          >
            {!sending && <Text>Withdraw</Text>}
            {sending && <Spinner color={blixtTheme.light} />}
          </Button>
        ]}
      />
    </Container>
  );
};

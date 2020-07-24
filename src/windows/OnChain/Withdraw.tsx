import React, { useState } from "react";
import { View } from "react-native";
import { Body, Text, Header, Container, Left, Button, Title, Icon, Input, Spinner } from "native-base";
import { StackNavigationProp } from "@react-navigation/stack";
import Slider from "@react-native-community/slider";

import { OnChainStackParamList } from "./index";
import { useStoreActions, useStoreState } from "../../state/store";
import BlixtForm from "../../components/Form";
import { blixtTheme } from "../../../native-base-theme/variables/commonColor";
import { parseBech32, toast } from "../../utils";
import { BitcoinUnits, convertBitcoinUnit } from "../../utils/bitcoin-units";
import useBalance from "../../hooks/useBalance";

export interface IOpenChannelProps {
  navigation: StackNavigationProp<OnChainStackParamList, "Withdraw">;
}
export default ({ navigation }: IOpenChannelProps) => {
  const sendCoins = useStoreActions((actions) => actions.onChain.sendCoins);
  const sendCoinsAll = useStoreActions((actions) => actions.onChain.sendCoinsAll);
  const getBalance = useStoreActions((actions) => actions.onChain.getBalance);
  const [address, setAddress] = useState("");
  const [sending, setSending] = useState(false);
  const [feeRate, setFeeRate] = useState(0);
  const [withdrawAll, setWithdrawAll] = useState(false);
  const bitcoinUnit = useStoreState((store) => store.settings.bitcoinUnit);
  const fiatUnit = useStoreState((store) => store.settings.fiatUnit);
  const {
    dollarValue,
    bitcoinValue,
    satoshiValue,
    onChangeFiatInput,
    onChangeBitcoinInput,
  } = useBalance();

  const onWithdrawClick = async () => {
    try {
      setSending(true);
      let result;
      if (withdrawAll) {
        result = await sendCoinsAll({
          address,
          feeRate: feeRate !== 0 ? feeRate : undefined,
        });
      }
      else {
        result = await sendCoins({
          address,
          sat: satoshiValue,
          feeRate: feeRate !== 0 ? feeRate : undefined,
        });
      }
      console.log(result);
      await getBalance(undefined);
      navigation.pop();

      toast("Withdraw succeeded", 6000, "success");
    } catch (e) {
      toast(`Error: ${e.message}`, 12000, "danger");
      setSending(false);
    }
  };

  const onAddressChange = (text: string) => {
    const parsed = parseBech32(text);
    setAddress(parsed.address);
    if (parsed.amount) {
      const s = convertBitcoinUnit(parsed.amount, "bitcoin", bitcoinUnit); // TODO test
      onChangeBitcoinInput(s.toString());
    }
  };

  const onCameraPress = () => {
    navigation.navigate("CameraFullscreen", {
      onRead: onAddressChange,
    });
  };

  const onWithdrawAllPress = () => {
    setWithdrawAll(true);
  };

  const onCancelWithdrawAllPress = () => {
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
              <Input
                testID="INPUT_AMOUNT"
                placeholder={`Amount ${BitcoinUnits[bitcoinUnit].nice}`}
                keyboardType="numeric"
                onChangeText={onChangeBitcoinInput}
                value={withdrawAll ? "Withdraw all funds" : bitcoinValue}
                disabled={withdrawAll}
              />
              {!withdrawAll
                ? <Button onPress={onWithdrawAllPress} style={{ marginRight: 5 }} small={true}><Text>All</Text></Button>
                : <Button onPress={onCancelWithdrawAllPress} style={{ marginRight: 5 }} small={true}><Text>x</Text></Button>
              }
            </>
          ),
        }, {
          key: "AMOUNT_FIAT",
          title: `Amount ${fiatUnit}`,
          active: !withdrawAll,
          component: (
            <>
              <Input
                testID="INPUT_AMOUNT_FIAT"
                placeholder={`Amount ${fiatUnit}`}
                keyboardType="numeric"
                onChangeText={onChangeFiatInput}
                value={dollarValue}
                disabled={withdrawAll}
              />
            </>
          ),
        }, {
          key: "SAT",
          title: `Fee-rate`,
          component: (
            <View style={{ flex: 1, flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingRight: 5 }}>
              <Slider
                style={{
                  width: 185,
                  height: 25,
                  marginTop: 10,
                  marginBottom: 10,
                }}
                onValueChange={setFeeRate}
                minimumValue={0}
                maximumValue={500}
                step={1}
                thumbTintColor={blixtTheme.primary}
                minimumTrackTintColor={blixtTheme.lightGray}
                maximumTrackTintColor={blixtTheme.lightGray}
              />
              <Text>
                {feeRate !== 0 &&
                  <>{feeRate} sat/b</>
                }
                {feeRate === 0 &&
                  "auto"
                }
              </Text>
            </View>
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

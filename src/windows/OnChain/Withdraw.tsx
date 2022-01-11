import React, { useState, useLayoutEffect, useRef } from "react";
import { StyleSheet, TextInput, View } from "react-native";
import { Text, Container, Button, Icon, Input, Spinner } from "native-base";
import { StackNavigationProp } from "@react-navigation/stack";
import Slider from "@react-native-community/slider";
import Long from "long";

import { OnChainStackParamList } from "./index";
import { useStoreActions, useStoreState } from "../../state/store";
import BlixtForm from "../../components/Form";
import { blixtTheme } from "../../native-base-theme/variables/commonColor";
import { parseBech32, toast } from "../../utils";
import { BitcoinUnits, convertBitcoinUnit } from "../../utils/bitcoin-units";
import useBalance from "../../hooks/useBalance";
import useFormatBitcoinValue from "../../hooks/useFormatBitcoinValue";

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
  const slider = useRef<Slider>(null);
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
  const onChainBalance = useStoreState((store) => store.onChain.balance);
  const formatBitcoinValue = useFormatBitcoinValue();

  useLayoutEffect(() => {
    navigation.setOptions({
      headerTitle: "Withdraw coins",
      headerShown: true,
    });
  }, [navigation]);

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
      toast(`Error: ${e.message}`, 12000, "danger", "OK");
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
      <BlixtForm
        items={[{
          key: "BTC_ADDRESS",
          title: "Address",
          component: (
            <>
              <Input
                testID="INPUT_BITCOIN_ADDRESS"
                placeholder="Bitcoin address"
                value={address}
                onChangeText={onAddressChange}
              />
              <Icon type="AntDesign" name="camera" onPress={onCameraPress} style={{ padding: 10 }} />
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
                returnKeyType="done"
                onChangeText={onChangeBitcoinInput}
                value={withdrawAll ? "Withdraw all funds" : bitcoinValue || ""}
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
                returnKeyType="done"
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
                ref={slider}
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
              <TextInput
                keyboardType="numeric"
                returnKeyType="done"
                value={`${feeRate || ""}`}
                onChangeText={(text) => {
                  let value = Math.min(Number.parseInt(text || "0"), 1000);
                  if (Number.isNaN(value)) {
                    value = 0
                  }
                  setFeeRate(value);
                  slider.current?.setNativeProps({ value })
                }}
                style={style.feeRateTextInput}
              />
              {feeRate !== 0 && <Text> sat/vB</Text>}
              {feeRate === 0 && <Text> auto</Text>}
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
        noticeText={`${formatBitcoinValue(Long.fromValue(onChainBalance))} available`}
        noticeIcon={Long.fromValue(onChainBalance).gt(0) ? null : "info"}
      />
    </Container>
  );
};

const style = StyleSheet.create({
  feeRateTextInput: {
    height: 21,
    fontFamily: blixtTheme.fontRegular,
    fontSize: 15,
    padding: 0,
    color: blixtTheme.light,
  },
});

import React, { useState, useLayoutEffect, useRef } from "react";
import { NativeModules, StyleSheet, TextInput, View } from "react-native";
import { Text, Container, Button, Icon, Spinner, CheckBox, Right, InputGroup } from "native-base";
import { StackNavigationProp } from "@react-navigation/stack";
import Slider from "@react-native-community/slider";
import Long from "long";
import { RouteProp } from "@react-navigation/native";

import { LightningInfoStackParamList } from "./index";
import { useStoreActions, useStoreState } from "../../state/store";
import BlixtForm from "../../components/Form";
import { blixtTheme } from "../../native-base-theme/variables/commonColor";
import useBalance from "../../hooks/useBalance";
import { toast } from "../../utils";
import useFormatBitcoinValue from "../../hooks/useFormatBitcoinValue";
import { PLATFORM } from "../../utils/constants";
import Input from "../../components/Input";

import { useTranslation } from "react-i18next";
import { namespaces } from "../../i18n/i18n.constants";
import { Alert } from "../../utils/alert";
import { lnrpc } from "../../../proto/lightning";

export interface IOpenChannelProps {
  navigation: StackNavigationProp<LightningInfoStackParamList, "OpenChannel">;
  route: RouteProp<LightningInfoStackParamList, "OpenChannel">;
}
export default function OpenChannel({ navigation, route }: IOpenChannelProps) {
  const t = useTranslation(namespaces.lightningInfo.openChannel).t;
  const peerUri = route.params?.peerUri;
  const connectAndOpenChannel = useStoreActions((actions) => actions.channel.connectAndOpenChannel);
  const connectAndOpenChannelAll = useStoreActions(
    (actions) => actions.channel.connectAndOpenChannelAll,
  );
  const getChannels = useStoreActions((actions) => actions.channel.getChannels);
  const [peer, setPeer] = useState(peerUri ?? "");
  const [opening, setOpening] = useState(false);
  const [feeRate, setFeeRate] = useState(0);
  const onChainBalance = useStoreState((store) => store.onChain.balance);
  const formatBitcoinValue = useFormatBitcoinValue();
  const slider = useRef<Slider>(null);
  const {
    dollarValue,
    bitcoinValue,
    satoshiValue,
    onChangeFiatInput,
    onChangeBitcoinInput,
    bitcoinUnit,
    fiatUnit,
  } = useBalance();
  const torEnabled = useStoreState((store) => store.settings.torEnabled);
  const changeTorEnabled = useStoreActions((store) => store.settings.changeTorEnabled);
  const [withdrawAll, setWithdrawAll] = useState(false);
  const [taprootChan, setTaprootChan] = useState(false);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerTitle: t("layout.title"),
      headerShown: true,
    });
  }, [navigation]);

  const onOpenChannelPress = async () => {
    try {
      setOpening(true);
      if (withdrawAll) {
        await connectAndOpenChannelAll({
          peer,
          feeRateSat: feeRate !== 0 ? feeRate : undefined,
          type: taprootChan ? lnrpc.CommitmentType["SIMPLE_TAPROOT"] : undefined,
        });
      } else {
        await connectAndOpenChannel({
          peer,
          amount: satoshiValue,
          feeRateSat: feeRate !== 0 ? feeRate : undefined,
          type: taprootChan ? lnrpc.CommitmentType["SIMPLE_TAPROOT"] : undefined,
        });
      }
      await getChannels(undefined);
      navigation.pop();
    } catch (error) {
      toast(`Error: ${error.message}`, 12000, "danger", "Okay");
      setOpening(false);

      // Special case if the error is likely related to Tor
      if (
        (torEnabled && error.message?.includes(".onion: no such host")) ||
        error.message?.includes(".onion: No address associated with hostname")
      ) {
        Alert.alert(t("torPrompt.title"), t("torPrompt.text1") + "\n\n" + t("torPrompt.text2"), [
          {
            text: "Cancel",
          },
          {
            text: "Activate Tor",
            async onPress(value?) {
              await changeTorEnabled(!torEnabled);
              if (PLATFORM === "android") {
                try {
                  await NativeModules.LndMobile.stopLnd();
                  await NativeModules.LndMobileTools.killLnd();
                } catch (e) {
                  console.log(e);
                }
                NativeModules.LndMobileTools.restartApp();
              } else {
                Alert.alert(
                  t("bitcoinNetwork.restartDialog.title", { ns: namespaces.settings.settings }),
                  t("bitcoinNetwork.restartDialog.msg", { ns: namespaces.settings.settings }),
                );
              }
            },
          },
        ]);
      }
    }
  };

  const onCameraPress = () => {
    navigation.navigate("CameraFullscreen", {
      onRead: setPeer,
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
        items={[
          {
            key: "CHANNEL",
            title: t("form.channel.title"),
            component: (
              <>
                <Input
                  placeholder={t("form.channel.placeholder")}
                  value={peer}
                  onChangeText={setPeer}
                />
                {PLATFORM !== "macos" && (
                  <Icon type="AntDesign" name="camera" onPress={onCameraPress} />
                )}
              </>
            ),
          },
          {
            key: "AMOUNT",
            title: `${t("form.amount.title")} ${bitcoinUnit.nice}`,
            component: (
              <>
                <Input
                  placeholder={`${t("form.amount.placeholder")} ${bitcoinUnit.nice}`}
                  keyboardType="numeric"
                  returnKeyType="done"
                  onChangeText={onChangeBitcoinInput}
                  value={
                    withdrawAll
                      ? t("form.amount.withdrawAll", { ns: namespaces.onchain.withdraw })
                      : bitcoinValue || ""
                  }
                />
                {!withdrawAll ? (
                  <Button onPress={onWithdrawAllPress} style={{ marginRight: 5 }} small={true}>
                    <Text>{t("form.amount.all", { ns: namespaces.onchain.withdraw })}</Text>
                  </Button>
                ) : (
                  <Button
                    onPress={onCancelWithdrawAllPress}
                    style={{ marginRight: 5 }}
                    small={true}
                  >
                    <Text>x</Text>
                  </Button>
                )}
              </>
            ),
          },
          {
            key: "AMOUNT_FIAT",
            active: !withdrawAll,
            title: `${t("form.amount.title")} ${fiatUnit}`,
            component: (
              <Input
                placeholder={`${t("form.amount.placeholder")} ${fiatUnit}`}
                keyboardType="numeric"
                returnKeyType="done"
                onChangeText={onChangeFiatInput}
                value={dollarValue}
                disabled={withdrawAll}
              />
            ),
          },
          {
            key: "SAT",
            title: t("form.fee_rate.title"),
            component: (
              <View
                style={{
                  flex: 1,
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                  paddingRight: 5,
                }}
              >
                {PLATFORM !== "macos" && (
                  <Slider
                    ref={slider}
                    style={{
                      flex: 1,
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
                )}
                <TextInput
                  keyboardType="numeric"
                  returnKeyType="done"
                  value={`${feeRate || ""}`}
                  onChangeText={(text) => {
                    let value = Math.min(Number.parseInt(text || "0"), 1000);
                    if (Number.isNaN(value)) {
                      value = 0;
                    }
                    setFeeRate(value);
                    slider.current?.setNativeProps({ value });
                  }}
                  style={style.feeRateTextInput}
                  enableFocusRing={false} // macOS prop
                />
                {feeRate !== 0 && <Text> sat/vB</Text>}
                {feeRate === 0 && <Text> auto</Text>}
              </View>
            ),
          },
          {
            key: "ENABLE_TAPROOT_CHANS",
            active: !withdrawAll,
            title: `Taproot channel`,
            component: (
              <View style={{ alignItems: "flex-end", flex: 1, marginRight: 15 }}>
                <CheckBox
                  checked={taprootChan}
                  onPress={() => setTaprootChan(!taprootChan)}
                  style={{ marginBottom: 10 }}
                />
              </View>
              // <Input placeholder={`${t("form.amount.placeholder")} ${fiatUnit}`} keyboardType="numeric" returnKeyType="done" onChangeText={onChangeFiatInput} value={dollarValue} disabled={withdrawAll} />
            ),
          },
        ]}
        buttons={[
          <Button
            key="OPEN_CHANNEL"
            onPress={onOpenChannelPress}
            block={true}
            primary={true}
            disabled={opening}
          >
            {!opening && <Text>{t("form.title")}</Text>}
            {opening && <Spinner color={blixtTheme.light} />}
          </Button>,
        ]}
        noticeText={`${formatBitcoinValue(onChainBalance)} available`}
        noticeIcon={Long.fromValue(onChainBalance).gt(0) ? null : "info"}
      />
    </Container>
  );
}

const style = StyleSheet.create({
  feeRateTextInput: {
    height: 21,
    fontFamily: blixtTheme.fontRegular,
    fontSize: 15,
    padding: 0,
    color: blixtTheme.light,
    backgroundColor: blixtTheme.gray,
    width: 40,
    textAlign: "center",
  },
});

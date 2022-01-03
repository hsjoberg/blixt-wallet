import React, { useState, useLayoutEffect, useRef } from "react";
import { StyleSheet, TextInput, View } from "react-native";
import { Text, Container, Button, Icon, Input, Spinner } from "native-base";
import { StackNavigationProp } from "@react-navigation/stack";
import Slider from "@react-native-community/slider";

import { LightningInfoStackParamList } from "./index";
import { useStoreActions } from "../../state/store";
import BlixtForm from "../../components/Form";
import { blixtTheme } from "../../native-base-theme/variables/commonColor";
import useBalance from "../../hooks/useBalance";
import { RouteProp } from "@react-navigation/native";
import { toast } from "../../utils";

import { useTranslation, TFunction } from "react-i18next";
import { namespaces } from "../../i18n/i18n.constants";

let t:TFunction;

export interface IOpenChannelProps {
  navigation: StackNavigationProp<LightningInfoStackParamList, "OpenChannel">;
  route: RouteProp<LightningInfoStackParamList, "OpenChannel">;
}
export default function OpenChannel({ navigation, route }: IOpenChannelProps) {
  t = useTranslation(namespaces.lightningInfo.openChannel).t;
  const peerUri = route.params?.peerUri;
  const connectAndOpenChannel = useStoreActions((actions) => actions.channel.connectAndOpenChannel);
  const getChannels = useStoreActions((actions) => actions.channel.getChannels);
  const [peer, setPeer] = useState(peerUri ?? "");
  const [opening, setOpening] = useState(false);
  const [feeRate, setFeeRate] = useState(0);
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

  useLayoutEffect(() => {
    navigation.setOptions({
      headerTitle: t("layout.title"),
      headerShown: true,
    });
  }, [navigation]);

  const onOpenChannelPress = async () => {
    try {
      setOpening(true);
      await connectAndOpenChannel({
        peer,
        amount: satoshiValue,
        feeRateSat: feeRate !== 0 ? feeRate : undefined,
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
          title: t("form.channel.title"),
          component: (
            <>
              <Input placeholder={t("form.channel.placeholder")} value={peer} onChangeText={setPeer} />
              <Icon type="AntDesign" name="camera" onPress={onCameraPress} />
            </>
          )
        }, {
          key: "AMOUNT",
          title: `${t("form.amount.title")} ${bitcoinUnit.nice}`,
          component: (<Input placeholder={`${t("form.amount.placeholder")} ${bitcoinUnit.nice}`} keyboardType="numeric" returnKeyType="done" onChangeText={onChangeBitcoinInput} value={bitcoinValue} />)
        }, {
          key: "AMOUNT_FIAT",
          title: `${t("form.amount.title")} ${fiatUnit}`,
          component: (<Input placeholder={`${t("form.amount.placeholder")} ${fiatUnit}`} keyboardType="numeric" returnKeyType="done" onChangeText={onChangeFiatInput} value={dollarValue} />)
        }, {
          key: "SAT",
          title: t("form.fee_rate.title"),
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
          <Button key="OPEN_CHANNEL" onPress={onOpenChannelPress} block={true} primary={true} disabled={opening}>
            {!opening && <Text>{t("form.title")}</Text>}
            {opening && <Spinner color={blixtTheme.light} />}
          </Button>
        ]}
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

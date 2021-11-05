import React from "react";
import { StyleSheet } from "react-native";
import { Container, View, Text, Icon } from "native-base";
import { useNavigation } from "@react-navigation/native";

import { useStoreActions, useStoreState, } from "../../state/store";
import { blixtTheme } from "../../native-base-theme/variables/commonColor";
import useFingerprintAuth from "../../hooks/useFingerprintAuth";
import { PLATFORM } from "../../utils/constants";
import { getStatusBarHeight } from "react-native-status-bar-height";

export default function ChangeFingerprintSettingsAuth() {
  const navigation = useNavigation();
  const setFingerprintEnabled = useStoreActions((store) => store.security.setFingerprintEnabled);
  const fingerPrintEnabled = useStoreState((store) => store.security.fingerprintEnabled);
  const sensor = useStoreState((store) => store.security.sensor);
  const startScan = useFingerprintAuth(async () => {
    navigation.goBack();
    await setFingerprintEnabled(!fingerPrintEnabled);
  }, true);

  return (
    <Container>
      <View style={style.content}>
        <Text style={style.message}>Authenticate to change biometrics settings</Text>
        <View style={[style.fingerPrintSymbolContainer, {
          marginBottom: sensor === "Face ID" ? 320 : 0,
        }]}>
          {sensor !== "Face ID" &&
            <Icon onPress={startScan} type="Entypo" name="fingerprint" style={style.fingerPrintSymbol} />
          }
          {sensor === "Face ID" &&
            <Icon onPress={startScan} type="MaterialCommunityIcons" name="face-recognition" style={style.fingerPrintSymbol} />
          }
        </View>
      </View>
      {PLATFORM === "ios" &&
        <Icon style={{
          position: "absolute",
          right: 0,
          padding: 4,
          top: getStatusBarHeight(true),
          }} type="Entypo" name="cross" onPress={() => navigation.goBack()}
        />
      }
    </Container>
  )
}

const style = StyleSheet.create({
  content: {
    flex: 1,
    justifyContent: "center",
  },
  message: {
    fontSize: 16,
    marginBottom: 12,
    textAlign: "center",
    // textTransform: "uppercase",
    backgroundColor: blixtTheme.dark, // Bug: Text disappears without this
  },
  fingerPrintSymbolContainer: {
    padding: 8,
    alignContent: "center",
    alignItems:"center",
    marginBottom: 16,
  },
  fingerPrintSymbol: {
    fontSize: 36
  },
});

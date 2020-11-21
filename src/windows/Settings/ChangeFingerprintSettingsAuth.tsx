import React, { useEffect } from "react";
import { StyleSheet, StatusBar, AppState, AppStateStatus } from "react-native";
import { Container, Content, View, Text, Icon } from "native-base";
import { useNavigation } from "@react-navigation/native";

import { useStoreActions, useStoreState, } from "../../state/store";
import { blixtTheme } from "../../../native-base-theme/variables/commonColor";
import useFingerprintAuth from "../../hooks/useFingerprintAuth";

export default function ChangeFingerprintSettingsAuth() {
  const navigation = useNavigation();
  const setFingerprintEnabled = useStoreActions((store) => store.security.setFingerprintEnabled);
  const fingerPrintEnabled = useStoreState((store) => store.security.fingerprintEnabled);
  const startScan = useFingerprintAuth(async () => {
    await setFingerprintEnabled(!fingerPrintEnabled);
    navigation.goBack();
  });

  return (
    <Container>
      <Content contentContainerStyle={style.content}>
        <Text style={style.message}>Authenticate to change fingerprint settings</Text>
        <View style={style.fingerPrintSymbolContainer}>
          <Icon onPress={startScan} type="Entypo" name="fingerprint" style={style.fingerPrintSymbol} />
        </View>
      </Content>
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

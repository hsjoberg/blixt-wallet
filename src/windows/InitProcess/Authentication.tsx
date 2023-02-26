import React, { useEffect } from "react";
import { StyleSheet, StatusBar, AppState, AppStateStatus } from "react-native";
import { View, Icon, Text } from "native-base";
import { StackNavigationProp } from "@react-navigation/stack";

import { useStoreActions, useStoreState } from "../../state/store";
import Pincode from "../../components/Pincode";
import { LoginMethods } from "../../state/Security";
import { smallScreen } from "../../utils/device";
import Container from "../../components/Container";
import useFingerprintAuth from "../../hooks/useFingerprintAuth";

export default function Authentication() {
  const loginPincode = useStoreActions((store) => store.security.loginPincode);
  const fingerprintEnabled = useStoreState((store) => store.security.fingerprintEnabled);
  const fingerprintStartScan = useStoreActions((store) => store.security.fingerprintStartScan);
  const fingerprintStopScan = useStoreActions((store) => store.security.fingerprintStopScan);
  const biometricsSensor = useStoreState((store) => store.security.sensor);
  const loginMethods = useStoreState((store) => store.security.loginMethods);
  const startScan = useFingerprintAuth(async () => {});

  const onTryCode = async (code: string) => {
    if (await loginPincode(code)) {
      return true;
    }
    return false;
  };

  return (
    <Container>
      <StatusBar
        barStyle="light-content"
        hidden={false}
        backgroundColor="transparent"
        animated={false}
        translucent={false}
      />
      <View style={style.content}>
        {loginMethods.has(LoginMethods.pincode) && (
          <Pincode onTryCode={onTryCode} textAction="Enter pincode" />
        )}
        {loginMethods.has(LoginMethods.fingerprint) && (
          <View style={style.fingerPrintSymbolContainer}>
            {biometricsSensor !== "Face ID" && (
              <Icon
                style={style.fingerPrintSymbol}
                type="Entypo"
                name="fingerprint"
                onPress={startScan}
              />
            )}
            {biometricsSensor === "Face ID" && (
              <Icon
                style={style.fingerPrintSymbol}
                type="MaterialCommunityIcons"
                name="face-recognition"
                onPress={startScan}
              />
            )}
          </View>
        )}
        {loginMethods.size === 0 && <Text style={{ textAlign: "center" }}>Error</Text>}
      </View>
    </Container>
  );
}

const style = StyleSheet.create({
  content: {
    flex: 1,
    justifyContent: "center",
  },
  fingerPrintSymbolContainer: {
    padding: 8,
    alignContent: "center",
    alignItems: "center",
    marginBottom: smallScreen ? 0 : 16,
  },
  fingerPrintSymbol: {
    fontSize: 36,
  },
});

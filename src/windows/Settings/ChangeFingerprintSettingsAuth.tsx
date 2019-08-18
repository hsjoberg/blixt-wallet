import React, { useEffect } from "react";
import { StyleSheet, StatusBar, AppState, AppStateStatus } from "react-native";
import { Container, Content, View, Text, Icon } from "native-base";
import { NavigationScreenProp } from "react-navigation";

import { useStoreActions, useStoreState, } from "../../state/store";

interface IProps {
  navigation: NavigationScreenProp<{}>;
}
export default ({ navigation }: IProps) => {
  const fingerprintAvailable = useStoreState((store) => store.security.fingerprintAvailable);
  const fingerprintStartScan = useStoreActions((store) => store.security.fingerprintStartScan);
  const fingerprintStopScan = useStoreActions((store) => store.security.fingerprintStopScan);
  const setFingerprintEnabled = useStoreActions((store) => store.security.setFingerprintEnabled);
  const fingerPrintEnabled = useStoreState((store) => store.security.fingerprintEnabled);

  // TODO fix useFingerprint hook
  useEffect(() => {
    console.log(fingerprintAvailable);
    if (fingerprintAvailable) {
      // Workaround a bug where leaving foreground would
      // cause fingerprint scanning to not respond
      // TODO check this code
      const handler = async (status: AppStateStatus) => {
        if (status === "background") {
          fingerprintStopScan();
        }
        else if (status === "active") {
          const r = await fingerprintStartScan();
          if (r) {
            await setFingerprintEnabled(!fingerPrintEnabled);
            navigation.pop();
          }
        }
      };
      AppState.addEventListener("change", handler);
      (async () => {
        const r = await fingerprintStartScan();
        if (r) {
          await setFingerprintEnabled(!fingerPrintEnabled);
          navigation.pop();
        }
      })();

      return () => {
        fingerprintStopScan();
        AppState.removeEventListener("change", handler);
      }
    }
  }, [fingerprintAvailable]);

  return (
    <Container>
      <StatusBar
        backgroundColor="transparent"
        hidden={false}
        translucent={true}
        networkActivityIndicatorVisible={true}
        barStyle="light-content"
      />
      <Content contentContainerStyle={style.content}>
        <Text style={style.message}>Authenticate to change fingerprint settings</Text>
        <View style={style.fingerPrintSymbolContainer}>
          <Icon type="Entypo" name="fingerprint" style={style.fingerPrintSymbol} />
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

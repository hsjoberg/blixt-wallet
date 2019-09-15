import React, { useEffect } from "react";
import { StyleSheet, StatusBar, AppState, AppStateStatus } from "react-native";
import { View, Icon, Text } from "native-base";
import { NavigationScreenProp } from "react-navigation";

import { useStoreActions, useStoreState } from "../../state/store";
import Pincode from "../../components/Pincode";
import { LoginMethods } from "../../state/Security";
import { smallScreen } from "../../utils/device";
import Container from "../../components/Container";

interface IProps {
  navigation: NavigationScreenProp<{}>;
}
export default ({ navigation }: IProps) => {
  const loginPincode = useStoreActions((store) => store.security.loginPincode);
  const fingerprintEnabled = useStoreState((store) => store.security.fingerprintEnabled);
  const fingerprintStartScan = useStoreActions((store) => store.security.fingerprintStartScan);
  const fingerprintStopScan = useStoreActions((store) => store.security.fingerprintStopScan);
  const loginMethods = useStoreState((store) => store.security.loginMethods);

  useEffect(() => {
    console.log(fingerprintEnabled);
    if (fingerprintEnabled) {
      // Workaround a bug where leaving foreground would
      // cause fingerprint scanning to not respond
      // TODO check this code
      // TODO make as a hook
      const handler = async (status: AppStateStatus) => {
        if (status === "background") {
          fingerprintStopScan();
        }
        else if (status === "active") {
          const r = await fingerprintStartScan();
          if (r) {
            setTimeout(() => navigation.navigate("InitLightning"), 1);
          }
        }
      };
      AppState.addEventListener("change", handler);

      (async () => {
        const r = await fingerprintStartScan();
        if (r) {
          setTimeout(() => navigation.navigate("InitLightning"), 1);
        }
      })();

      return () => {
        fingerprintStopScan();
        AppState.removeEventListener("change", handler);
      }
    }
  }, [fingerprintEnabled]);

  const onTryCode = async (code: string) => {
    if (await loginPincode(code)) {
      setTimeout(() => navigation.navigate("InitLightning"), 1);
      return true;
    }
    return false;
  }

  return (
    <Container>
      <StatusBar
        backgroundColor="transparent"
        hidden={false}
        translucent={true}
        networkActivityIndicatorVisible={true}
        barStyle="light-content"
      />
      <View style={style.content}>
        {loginMethods.has(LoginMethods.pincode) &&
          <Pincode onTryCode={onTryCode} textAction="Enter pincode" />
        }
        {loginMethods.has(LoginMethods.fingerprint) &&
          <View style={style.fingerPrintSymbolContainer}>
            <Icon type="Entypo" name="fingerprint" style={style.fingerPrintSymbol} />
          </View>
        }
        {loginMethods.size === 0 && <Text style={{textAlign: "center"}}>Error</Text>}
      </View>
    </Container>
  )
}

const style = StyleSheet.create({
  content: {
    flex: 1,
    justifyContent: "center",
  },
  fingerPrintSymbolContainer: {
    padding: 8,
    alignContent: "center",
    alignItems:"center",
    marginBottom: smallScreen ? 0 : 16,
  },
  fingerPrintSymbol: {
    fontSize: 36
  },
});

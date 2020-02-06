import React, { useEffect } from "react";
import { StyleSheet, StatusBar, Linking, NativeModules } from "react-native";
import { Spinner, H1, H3 } from "native-base";
import { NavigationScreenProp } from "react-navigation";
import * as Base64 from "base64-js";

import { useStoreActions, useStoreState } from "../../state/store";
import { blixtTheme } from "../../../native-base-theme/variables/commonColor";
import Container from "../../components/Container";
import { timeout, bytesToString } from "../../utils";

interface IProps {
  navigation: NavigationScreenProp<{}>;
}
export default ({ navigation }: IProps) => {
  const initializeLightning = useStoreActions((store) => store.lightning.initialize);
  const nodeInfo = useStoreState((store) => store.lightning.nodeInfo);
  const firstSync = useStoreState((store) => store.lightning.firstSync);
  const ready = useStoreState((store) => store.lightning.ready);
  const rpcReady = useStoreState((store) => store.lightning.rpcReady);
  const setPayment = useStoreActions((store) => store.send.setPayment);

  useEffect(() => {
    (async () => {
      await initializeLightning();
      console.log("initializeLightning() done");
    })();
  }, [initializeLightning]);

  if (ready) {
    // Check for deep links
    setTimeout(async () => {
      try {
        let lightningURI = await Linking.getInitialURL();
        if (lightningURI === null) {
          lightningURI = await NativeModules.LndMobile.getIntentStringData();
        }
        if (lightningURI === null) {
          lightningURI = await NativeModules.LndMobile.getIntentNfcData();
        }

        if (lightningURI && lightningURI.startsWith("lightning:")) {
          console.log("try lightningURI");

          while (!rpcReady) {
            await timeout(500);
          }

          await setPayment({
            paymentRequestStr: lightningURI.toUpperCase().replace("LIGHTNING:", ""),
          });
          navigation.navigate("SendConfirmation");
          return;
        }
      } catch (e) {
        console.log(e.message);
      }
      navigation.navigate("Main");
    }, 0);
  }

  return (
    <Container centered>
      <StatusBar
        backgroundColor="transparent"
        hidden={false}
        translucent={true}
        networkActivityIndicatorVisible={true}
        barStyle="light-content"
      />
      <Spinner color={blixtTheme.light} size={55} />
      {!ready && nodeInfo && !nodeInfo.syncedToChain &&
        <>
          <H1>Syncing chain...</H1>
          {/* {firstSync && <H3 style={style.firstSync}>This might take a couple of minutes</H3>} */}
        </>
      }
    </Container>
  );
};

const style = StyleSheet.create({
  firstSync: {
    fontWeight: "normal",
    marginTop: 9,
  },
});

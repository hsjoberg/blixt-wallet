import React, { useEffect } from "react";
import { StyleSheet, StatusBar, Linking, NativeModules } from "react-native";
import { Spinner, H1, H3 } from "native-base";
import { StackNavigationProp } from "@react-navigation/stack";

import { RootStackParamList } from "../../Main";
import { useStoreActions, useStoreState } from "../../state/store";
import { blixtTheme } from "../../native-base-theme/variables/commonColor";
import Container from "../../components/Container";
import { timeout } from "../../utils";

import { useTranslation } from "react-i18next";
import { namespaces } from "../../i18n/i18n.constants";

export default function InitLightning() {
  const t = useTranslation(namespaces.initProcess.initLightning).t;
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

  // if (ready) {
  //   // Check for deep links
  //   setTimeout(async () => {
  //     try {
  //       let lightningURI = await Linking.getInitialURL();
  //       if (lightningURI === null) {
  //         lightningURI = await NativeModules.LndMobileTools.getIntentStringData();
  //       }
  //       if (lightningURI === null) {
  //         lightningURI = await NativeModules.LndMobileTools.getIntentNfcData();
  //       }

  //       if (lightningURI && lightningURI.startsWith("lightning:")) {
  //         console.log("try lightningURI");

  //         while (!rpcReady) {
  //           await timeout(500);
  //         }

  //         await setPayment({
  //           paymentRequestStr: lightningURI.toUpperCase().replace("LIGHTNING:", ""),
  //         });
  //         navigation.navigate("SendConfirmation");
  //         return;
  //       }
  //     } catch (e) {
  //       console.log(e.message);
  //     }
  //   }, 0);
  //   navigation.replace("Overview");
  // }

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
          <H1>{t("title")}...</H1>
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

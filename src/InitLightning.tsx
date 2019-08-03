import React, { useEffect } from "react";
import { StyleSheet, StatusBar } from "react-native";
import { Spinner, H1, Container, H3 } from "native-base";
import { useStoreActions, useStoreState } from "./state/store";
import { NavigationScreenProp } from "react-navigation";

import { blixtTheme } from "../native-base-theme/variables/commonColor";

interface IProps {
  navigation: NavigationScreenProp<{}>;
}
export default ({ navigation }: IProps) => {
  const initializeLightning = useStoreActions((store) => store.lightning.initialize);
  const nodeInfo = useStoreState((store) => store.lightning.nodeInfo);
  const firstSync = useStoreState((store) => store.lightning.firstSync);
  const ready = useStoreState((store) => store.lightning.ready);

  useEffect(() => {
    (async () => {
      await initializeLightning(undefined);
      console.log("initializeLightning() done");
    })();
  }, [initializeLightning]);

  if (nodeInfo && nodeInfo.syncedToChain && ready) {
    setTimeout(async () => {
      navigation.navigate("Main");
    }, 1);
  }

  return (
    <Container style={styles.content}>
      <StatusBar
        backgroundColor="transparent"
        hidden={false}
        translucent={true}
        networkActivityIndicatorVisible={true}
        barStyle="light-content"
      />
      <Spinner color={blixtTheme.light} size={55} />
      {nodeInfo &&
        <>
          {(!nodeInfo.syncedToChain && <H1>Syncing chain...</H1>) || <H1 />}
          {firstSync && <H3 style={{ fontWeight: "normal", marginTop: 8 }}>This might take a couple of minutes</H3>}
        </>
      }
    </Container>
  );
};

const styles = StyleSheet.create({
  content: {
    flex: 1,
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
});

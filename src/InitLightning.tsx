import React, { useEffect, useState } from "react";
import { StyleSheet, StatusBar } from "react-native";
import { Content, Spinner, H1, Container } from "native-base";
import { useStoreActions, useStoreState } from "./state/store";
import { NavigationScreenProp } from "react-navigation";

import { blixtTheme } from "../native-base-theme/variables/commonColor";

interface IProps {
  navigation: NavigationScreenProp<{}>;
}
export default ({ navigation }: IProps) => {
  const initializeLightning = useStoreActions((store) => store.lightning.initialize);
  const getTransactions = useStoreActions((store) => store.transaction.getTransactions);
  const getChannels = useStoreActions((store) => store.channel.getChannels);
  const nodeInfo = useStoreState((store) => store.lightning.nodeInfo);
  const [error, setError] = useState<string | undefined>(undefined);

  useEffect(() => {
    (async () => {
      if (await initializeLightning()) {
        // navigation.navigate("Main");
      }
      else {
        setError("Error");
      }
      console.log("initializeLightning() done");
    })();
  }, []);

  if (nodeInfo && nodeInfo.syncedToChain) {
    setTimeout(async () => {
      await getTransactions();
      await getChannels();
      navigation.navigate("Main");
    }, 100);
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
      {!error && <Spinner color={blixtTheme.light} size={55} />}
      {error && <H1 style={{color: "red"}}>{error}</H1>}
      {nodeInfo && !nodeInfo.syncedToChain && <H1>Syncing chain...</H1> || <H1></H1>}
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

import React, { useEffect, useState } from "react";
import { StyleSheet, StatusBar } from "react-native";
import { Content, Spinner, H1 } from "native-base";
import { useActions, useStore } from "./state/store";
import { NavigationScreenProp } from "react-navigation";

interface IProps {
  navigation: NavigationScreenProp<{}>;
}
export default ({ navigation }: IProps) => {
  const initializeLightning = useActions((store) => store.lightning.initialize);
  const getTransactions = useActions((store) => store.transaction.getTransactions);
  const getChannels = useActions((store) => store.channel.getChannels);
  const nodeInfo = useStore((store) => store.lightning.nodeInfo);
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
    <Content contentContainerStyle={styles.content}>
      <StatusBar
        backgroundColor="transparent"
        hidden={false}
        translucent={true}
        networkActivityIndicatorVisible={true}
        barStyle="dark-content"
      />
      {!error && <Spinner color="black" size={55} />}
      {error && <H1 style={{color: "red"}}>{error}</H1>}
      {nodeInfo && !nodeInfo.syncedToChain && <H1>Syncing chain...</H1> || <H1></H1>}
    </Content>
  );
};

const styles = StyleSheet.create({
  content: {
    flex: 1,
    height: "100%",
    backgroundColor: "#EFEFEF",
    justifyContent: "center",
    alignItems: "center",
  },
});

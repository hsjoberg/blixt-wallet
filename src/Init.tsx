import React, { useEffect } from "react";
import { StyleSheet, StatusBar, ScrollView } from "react-native";
import { Root, Container } from "native-base";
import { NavigationScreenProp } from "react-navigation";

import { useStoreState, useStoreActions } from "./state/store";


interface IProps {
  navigation: NavigationScreenProp<{}>;
}
export default ({ navigation }: IProps) => {
  const actions = useStoreActions((store) => store);
  const app = useStoreState((store) => store.app);
  const lndReady = useStoreState((store) => store.lndReady);

  useEffect(() => {
    (async () => {
      try {
        await actions.initializeApp();
      }
      catch (e) {
        console.log(e);
      }
    })();
  }, [actions]);

  if (lndReady) {
    if (app && !app.walletCreated) {
      setTimeout(() => navigation.navigate("Welcome"), 1);
    }
    else if (app && app.walletCreated) {
      setTimeout(() => navigation.navigate("InitLightning"), 1);
    }
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

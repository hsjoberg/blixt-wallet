import React, { useEffect } from "react";
import { StyleSheet, StatusBar, ScrollView } from "react-native";
import { Root } from "native-base";
import { NavigationScreenProp } from "react-navigation";

import { useStore, useActions } from "./state/store";


interface IProps {
  navigation: NavigationScreenProp<{}>;
}
export default ({ navigation }: IProps) => {
  const actions = useActions((store) => store);
  const app = useStore((store) => store.app);

  useEffect(() => {
    (async () => {
      try {
        await actions.initializeApp();
      }
      catch (e) {
        console.log(e);
      }
    })();
  }, []);

  if (app && !app.walletCreated) {
    setTimeout(() => navigation.navigate("Welcome"), 1);
  }
  else if (app && app.walletCreated) {
    setTimeout(() => navigation.navigate("InitLightning"), 1);
  }
  else {
    console.log("ERROR");
  }

  return (
    <Root>
      <ScrollView contentContainerStyle={styles.content}>
        <StatusBar
          backgroundColor="transparent"
          hidden={false}
          translucent={true}
          networkActivityIndicatorVisible={true}
          barStyle="dark-content"
        />
      </ScrollView>
    </Root>
  );
};

const styles = StyleSheet.create({
  content: {
    padding: 16,
  },
});

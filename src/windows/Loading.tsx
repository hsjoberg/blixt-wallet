import React, { useEffect } from "react";
import { StyleSheet, StatusBar } from "react-native";
import { Spinner, H1, Button, Text } from "native-base";

import { blixtTheme } from "../../native-base-theme/variables/commonColor";
import Container from "../components/Container";
import { useStoreState, useStoreActions } from "../state/store";
import { StackNavigationProp } from "@react-navigation/stack";
import { RootStackParamList } from "../Main";

export interface ILoadingProps {
  navigation: StackNavigationProp<RootStackParamList, "Loading">;
}
export default ({ navigation }: ILoadingProps) => {
  const checkDeeplink = useStoreActions((store) => store.androidDeeplinkManager.checkDeeplink);
  const appReady = useStoreState((store) => store.appReady);

  useEffect(() => {
    if (!appReady) {
      return;
    }
    // tslint:disable-next-line
    (async () => {
      const cb = await checkDeeplink({ navigate: true });
      navigation.replace("Overview");
      if (cb) {
        cb(navigation);
      }
    })();
  }, [appReady]);


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
      {/* <>
        <H1>Syncing chain...</H1>
      </> */}
    </Container>
  );
};

const style = StyleSheet.create({
  firstSync: {
    fontWeight: "normal",
    marginTop: 9,
  },
});

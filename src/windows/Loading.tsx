import React, { useEffect } from "react";
import { StyleSheet, StatusBar } from "react-native";
import { Spinner } from "native-base";

import { blixtTheme } from "../native-base-theme/variables/commonColor";
import Container from "../components/Container";
import { useStoreState, useStoreActions } from "../state/store";
import { StackNavigationProp } from "@react-navigation/stack";
import { RootStackParamList } from "../Main";
import { CommonActions } from "@react-navigation/native";
import { PLATFORM } from "../utils/constants";

export interface ILoadingProps {
  navigation: StackNavigationProp<RootStackParamList, "Loading">;
}
export default function Loading({ navigation }: ILoadingProps) {
  const checkDeeplink = useStoreActions((store) => store.deeplinkManager.checkDeeplink);

  useEffect(() => {
    // tslint:disable-next-line
    (async () => {
      let cb = await checkDeeplink();

      navigation.dispatch(
        CommonActions.reset({
            index: 0,
            routes: [{ name: "Overview" }],
        })
      );
      if (cb) {
        cb(navigation);
      } else if (PLATFORM === "web" && window.BLIXT_WEB_DEMO) {
        navigation.navigate("WebInfo");
      }
    })();
  }, []);


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

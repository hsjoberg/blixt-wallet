import React from "react";
import { StyleSheet, StatusBar } from "react-native";
import { Spinner, H1 } from "native-base";

import { blixtTheme } from "../../native-base-theme/variables/commonColor";
import Container from "../components/Container";

export default () => {
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

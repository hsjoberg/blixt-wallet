import React from "react";
import { StyleSheet, View } from "react-native";
import { Spinner } from "native-base";

import { blixtTheme } from "../native-base-theme/variables/commonColor";

export default function Loading() {
  return (
    <View style={style.loadingContainer}>
      <Spinner size={55} color={blixtTheme.light} />
    </View>
  );
}

const style = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
});

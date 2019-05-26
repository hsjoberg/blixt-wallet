import React, { useEffect } from "react";
import { StyleSheet, StatusBar } from "react-native";
import { Content, Spinner } from "native-base";
import { useActions } from "./state/store";

export default () => {
  const initializeLightning = useActions((store) => store.lightning.initialize);

  useEffect(() => {
    (async () => {
      const t = await initializeLightning();
      console.log(t);
    })();
  }, []);

  return (
    <Content contentContainerStyle={styles.content}>
      <StatusBar
        barStyle="dark-content"
        hidden={false}
        backgroundColor="#EFEFEF"
        animated={true}
        translucent={false}
      />
      <Spinner color="black" size={55} />
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

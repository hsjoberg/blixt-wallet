import React, { useEffect } from "react";
import { StyleSheet, StatusBar } from "react-native";
import { Content, Spinner } from "native-base";
import { useActions } from "./state/store";
import { NavigationScreenProp } from "react-navigation";

interface IProps {
  navigation: NavigationScreenProp<{}>;
}
export default ({ navigation }: IProps) => {
  const initializeLightning = useActions((store) => store.lightning.initialize);

  useEffect(() => {
    (async () => {
      const response = await initializeLightning();
      console.log("initializeLightning() done");
      console.log(response);
      navigation.navigate("Main");
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

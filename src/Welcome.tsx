import React, { useEffect } from "react";
import { StyleSheet } from "react-native";
import { Content, Text } from "native-base";
import { NavigationScreenProp } from "react-navigation";

interface IProps {
  navigation: NavigationScreenProp<{}>;
}
export default ({ navigation }: IProps) => {
  useEffect(() => {
    (async () => {
      navigation.navigate("InitLightning");
    })();
  }, []);

  return (
    <Content contentContainerStyle={styles.content}>
      <Text>Welcome</Text>
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

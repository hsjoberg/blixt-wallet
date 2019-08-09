import React from "react";
import { StyleSheet, StatusBar } from "react-native";
import { Text, Button, Container, H1 } from "native-base";
import { NavigationScreenProp } from "react-navigation";
import { useStoreActions } from "../../state/store";

interface IProps {
  navigation: NavigationScreenProp<{}>;
}
export default ({ navigation }: IProps) => {
  const createWallet = useStoreActions((store) => store.createWallet);

  const onCreateWallet = async () => {
    const result = await createWallet({
      password: "test1234",
    });
    console.log(result);

    navigation.navigate("InitLightning");
  };

  return (
    <Container style={styles.content}>
      <StatusBar
        backgroundColor="transparent"
        hidden={false}
        translucent={true}
        networkActivityIndicatorVisible={true}
        barStyle="light-content"
      />
      <H1>Welcome</H1>
      <Button style={{ alignSelf: "center", margin: 10 }} onPress={onCreateWallet}>
        <Text>Create wallet</Text>
      </Button>
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

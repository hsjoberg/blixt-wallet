import React, { useEffect } from "react";
import { StyleSheet, NativeModules } from "react-native";
import { Content, Text, Button } from "native-base";
import { NavigationScreenProp } from "react-navigation";
import { useActions } from "./state/store";

const timeout = (time: number) => new Promise((resolve) => setTimeout(() => resolve(), time));

interface IProps {
  navigation: NavigationScreenProp<{}>;
}
export default ({ navigation }: IProps) => {
  const setWalletCreated = useActions((store) => store.setWalletCreated);

  return (
    <Content contentContainerStyle={styles.content}>
      <Text>Welcome</Text>
      <Button
        onPress={async () => {
          const result = await NativeModules.LndGrpc.initWallet("test1234");
          await setWalletCreated(true);

          let gotMacaroon = false;
          do {
            console.log("Trying to get macaroon");
            gotMacaroon = await NativeModules.LndGrpc.readMacaroon();
            if (!gotMacaroon) {
              await timeout(1000);
            }
          } while (!gotMacaroon);

          navigation.navigate("InitLightning");
        }}
      ><Text>Create wallet</Text></Button>
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

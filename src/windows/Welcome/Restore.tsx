import React, { useState } from "react";
import { StatusBar, StyleSheet, Alert } from "react-native";
import { Container, Text, View, Button, H1, Textarea, Content } from "native-base";

import { useStoreActions } from "../../state/store";
import { NavigationScreenProp } from "react-navigation";
import { blixtTheme } from "../../../native-base-theme/variables/commonColor";

interface IProps {
  navigation: NavigationScreenProp<{}>;
}
export default ({ navigation }: IProps) => {
  const [seedText, setSeedText] = useState("");
  const setWalletSeed = useStoreActions((store) => store.setWalletSeed);
  const createWallet = useStoreActions((store) => store.createWallet);

  const onRestorePress = async () => {
    try {
      console.log(seedText);
      const splittedSeed = seedText.split(" ");
      if (splittedSeed.length !== 24) {
        Alert.alert("Seed must be exactly 24 words");
        return;
      }
      setWalletSeed(splittedSeed);
      await createWallet();
      navigation.navigate("InitLightning");
    } catch (e) {
      Alert.alert(e.message);
    }
  };

  return (
    <Container>
      <StatusBar
        backgroundColor={blixtTheme.dark}
        hidden={false}
        translucent={false}
        networkActivityIndicatorVisible={true}
        barStyle="light-content"
      />
      <Content contentContainerStyle={style.content}>
        <View style={style.upperContent}>
          <View style={style.seed}>
            <Textarea
              style={{width: "100%", backgroundColor: blixtTheme.gray, fontSize: 20, }}
              rowSpan={8}
              bordered={false}
              underline={false}
              onChangeText={setSeedText}
              value={seedText}
            />
          </View>
          <View style={style.text}>
            <H1 style={style.textHeader}>Restore wallet</H1>
            <Text>
              To restore your wallet, write each word from your seed separated by a space.{"\n"}
            </Text>
          </View>
        </View>
        <View style={style.buttons}>
          <Button block={true} onPress={onRestorePress}>
            <Text>Restore Wallet</Text>
          </Button>
        </View>
      </Content>
    </Container>
  );
}

const style = StyleSheet.create({
  content: {
    width: "100%",
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  seed: {
    marginTop: 32,
    height: 200,
    flexDirection: "row",
    justifyContent: "center",
    alignContent: "center",
  },
  upperContent: {
    width: "100%",
    height: "100%",
  },
  buttons: {
    width: "100%",
    bottom: 24,
  },
  text: {
    flex: 1,
    marginTop: 24,
    width: "100%",
  },
  textHeader: {
    marginBottom: 3,
  },
  card: {

  },
  cardItem: {
    width: "100%",
    flex: 1,
    flexDirection: "row",
    justifyContent: "space-around",
  },
  wordColumn: {
    flex: 1,
    height: "100%",
    justifyContent: "space-around",
  },
});

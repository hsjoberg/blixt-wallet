import React from "react";
import { StyleSheet, StatusBar, Animated, Alert } from "react-native";
import { Text,  Container, H1, Button, View } from "native-base";
import { NavigationScreenProp } from "react-navigation";
import { useStoreActions } from "../../state/store";
import * as Animatable from "react-native-animatable";

interface IAnimatedH1Props {
  children: JSX.Element | string;
}
const AnimatedH1 = ({ children }: IAnimatedH1Props) => {
  const AnimH1 = Animatable.createAnimatableComponent(H1);
  return (
    <AnimH1 style={style.header} duration={650} animation="fadeInDown" useNativeDriver={true}>
      {children}
    </AnimH1>
  );
};

interface IAnimatedViewProps {
  children: JSX.Element[];
}
const AnimatedView = ({ children }: IAnimatedViewProps) => (
  <Animatable.View duration={650} style={style.buttons} animation="fadeInUp" useNativeDriver={true}>
    {children}
  </Animatable.View>
);

export interface IStartProps {
  navigation: NavigationScreenProp<{}>;
}
export default ({ navigation }: IStartProps) => {
  const generateSeed = useStoreActions((store) => store.generateSeed);

  const onCreateWalletPress = async () => {
    try {
      await generateSeed(undefined);
      Alert.alert(
        "Warning",
        "Blixt Wallet is still at an early stage of development.\nIf you use this wallet, make sure you understand that you may lose your funds.\n\nThere is currently no way to backup your channels nor WatchTower support to watch your channels while you are offline.",
        [{
          text: "I am reckless, continue",
        }]
      );
      navigation.navigate("Seed");
    } catch (e) {
      Alert.alert(e.message);
    }
  };

  const onRestoreWalletPress = async () => {
    navigation.navigate("Restore");
  };

  return (
    <Container>
      <View style={style.content}>
        <StatusBar
          backgroundColor="transparent"
          hidden={false}
          translucent={true}
          networkActivityIndicatorVisible={true}
          barStyle="light-content"
        />
        <AnimatedH1>Welcome</AnimatedH1>
        <AnimatedView>
          <Button style={style.button} onPress={onCreateWalletPress}>
            <Text>Create Wallet</Text>
          </Button>
          <Button style={style.button} onPress={onRestoreWalletPress}>
            <Text>Restore Wallet</Text>
          </Button>
        </AnimatedView>
      </View>
    </Container>
  );
};

const style = StyleSheet.create({
  content: {
    flex: 1,
    width: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  header: {
    fontSize: 38,
    lineHeight: 42,
  },
  buttons: {
    flexDirection: "row",
    alignSelf: "center",
    margin: 10,
  },
  button: {
    margin: 8,
  },
});

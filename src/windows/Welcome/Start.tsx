import React, { useState } from "react";
import { StyleSheet, StatusBar, Animated, Alert } from "react-native";
import { Text, H1, Button, View, Spinner } from "native-base";
import { useStoreActions } from "../../state/store";
import * as Animatable from "react-native-animatable";

import { NavigationAction, CommonActions } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";

import { WelcomeStackParamList } from "./index";
import Container from "../../components/Container";
import { blixtTheme } from "../../../native-base-theme/variables/commonColor";

interface IAnimatedH1Props {
  children: JSX.Element | string;
}
function AnimatedH1({ children }: IAnimatedH1Props) {
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
function AnimatedView({ children }: IAnimatedViewProps) {
  return (
    <Animatable.View duration={660} style={style.buttons} animation="fadeInUp" useNativeDriver={true}>
      {children}
    </Animatable.View>
  );
}

export interface IStartProps {
  navigation: StackNavigationProp<WelcomeStackParamList, "Start">;
}
export default function Start({ navigation }: IStartProps) {
  const setHoldonboarding = useStoreActions((state) => state.setHoldOnboarding);
  const generateSeed = useStoreActions((store) => store.generateSeed);
  const createWallet = useStoreActions((store) => store.createWallet);
  const setSyncEnabled = useStoreActions((state) => state.scheduledSync.setSyncEnabled);
  const changeScheduledSyncEnabled = useStoreActions((state) => state.settings.changeScheduledSyncEnabled);
  const [createWalletLoading, setCreateWalletLoading] = useState(false);

  const onCreateWalletPress = async () => {
    try {
      await generateSeed(undefined);
      Alert.alert(
        "Warning",
        "Blixt Wallet is still at an early stage of development.\n\nIf you use this wallet, make sure you understand that you may lose your funds.\n\nThere is currently no WatchTower support to watch your channels while you are offline.",
        [{
          text: "I am reckless, continue",
          onPress: async  () => {
            setCreateWalletLoading(true);
            // setHoldonboarding(true);
            await createWallet();
            // await getAddress({});
            await setSyncEnabled(true); // TODO test
            await changeScheduledSyncEnabled(true);

            navigation.dispatch(
              CommonActions.reset({
                index: 0,
                routes: [
                  { name: "Loading" },
                ],
              })
            );
          }
        }],
      );
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
        {!createWalletLoading
          ? <AnimatedH1>Welcome</AnimatedH1>
          : <H1 style={style.header}>Welcome</H1>
        }
        {!createWalletLoading
          ?
            <AnimatedView>
              <Button style={style.button} onPress={onCreateWalletPress}>
                {!createWalletLoading && <Text>Create Wallet</Text>}
                {createWalletLoading && <Spinner color={blixtTheme.light} />}
              </Button>
              <Button style={style.button} onPress={onRestoreWalletPress}>
                <Text>Restore Wallet</Text>
              </Button>
            </AnimatedView>
          :
            <Spinner color={blixtTheme.light} />
        }
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

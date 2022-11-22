import { Alert, NativeModules, StatusBar } from "react-native";
import { CardStyleInterpolators, StackNavigationOptions, createStackNavigator } from "@react-navigation/stack";
import { H1, Spinner } from "native-base";
import React, { useEffect, useState } from "react";
import { useStoreActions, useStoreState } from "./state/store";

import Authentication from "./windows/InitProcess/Authentication";
import CameraFullscreen from "./windows/CameraFullscreen";
import Contacts from "./windows/Contacts";
import Container from "./components/Container";
import DEV_Commands from "./windows/InitProcess/DEV_Commands";
import GoogleDriveTestbed from "./windows/Google/GoogleDriveTestbed";
import Help from "./windows/Help";
import KeysendExperiment from "./windows/Keysend/Experiment";
import KeysendTest from "./windows/Keysend/Test";
import LNURL from "./windows/LNURL";
import LightningInfo from "./windows/LightningInfo";
import Loading from "./windows/Loading";
import LoadingModal from "./windows/LoadingModal";
import OnChain from "./windows/OnChain";
import Overview from "./windows/Overview";
import { PLATFORM } from "./utils/constants";
import Receive from "./windows/Receive";
import Send from "./windows/Send";
import Settings from "./windows/Settings";
import SyncInfo from "./windows/SyncInfo";
import TransactionDetails from "./windows/TransactionDetails";
import WebInfo from "./windows/Web/Info";
import WebLNBrowser from "./windows/WebLN/Browser";
import Welcome from "./windows/Welcome";
import { blixtTheme } from "./native-base-theme/variables/commonColor";
import { navigator } from "./utils/navigation";
import { toast } from "./utils";
import useStackNavigationOptions from "./hooks/useStackNavigationOptions";

const RootStack = createStackNavigator();

export type RootStackParamList = {
  DEV_Commands: undefined;
  Authentication: undefined;

  Loading: undefined;
  LoadingModal: undefined;
  CameraFullscreen: {
    onRead: (address: string) => void;
  };
  Welcome: undefined;
  Overview: undefined;
  Help: undefined;
  TransactionDetails: {
    rHash: string; // TODO
  };
  SyncInfo: undefined;
  Receive: undefined;
  Send: undefined;
  OnChain: undefined;
  Settings: undefined;
  LNURL: undefined;
  GoogleDriveTestbed: undefined;
  KeysendTest: undefined;
  KeysendExperiment: undefined;
  DeeplinkChecker: undefined;
  WebLNBrowser: {
    url: string;
  } | undefined;
  WebInfo: undefined;

  DEV_CommandsX: undefined;
}

export default function Main() {
  const holdOnboarding = useStoreState((store) => store.holdOnboarding);
  const appReady = useStoreState((store) => store.appReady);
  const lightningReady = useStoreState((store) => store.lightning.ready);
  const walletCreated = useStoreState((store) => store.walletCreated);
  const loggedIn = useStoreState((store) => store.security.loggedIn);
  const initializeApp = useStoreActions((store) => store.initializeApp);
  const [initialRoute, setInitialRoute] = useState("Loading");
  const torLoading = useStoreState((store) => store.torLoading);

  const [state, setState] =
    useState<"init" | "authentication" | "onboarding" | "started">("init");

  useEffect(() => {
    // tslint:disable-next-line
    (async () => {
      if (!appReady) {
        try {
          await initializeApp();
        } catch (e) {
          toast(e.message, 0, "danger");
        }
      }
    })();
  }, [appReady]);

  useEffect(() => {
    if (!appReady) {
      return;
    }
    // tslint:disable-next-line
    (async () => {
      if (!loggedIn) {
        setState("authentication");
      }
      else if (!lightningReady) {
        setState("started");
        if (!walletCreated) {
          setInitialRoute("Welcome");
        }
        else {
          // try {
          //   const lightningTimeout = setTimeout(() => {
          //     Alert.alert(
          //       "",
          //       "It looks like Blixt Wallet is having trouble starting lnd.\n" +
          //       "What do you want to do?",
          //       [{
          //         text: "Go to Help Center",
          //         onPress: () => {
          //           navigator.current?.navigate("Settings", { screen: "LndMobileHelpCenter" });
          //         },
          //         style:"default",
          //       }, {
          //         text: "Restart app",
          //         onPress: async () => {
          //           await NativeModules.LndMobileTools.killLnd();
          //           NativeModules.LndMobileTools.restartApp();
          //         },
          //       }, {
          //         text: "Try again",
          //         onPress: () => {
          //           setAppReady(false);
          //         },
          //       }]
          //     )
          //   }, 12 * 1000);
          //   clearTimeout(lightningTimeout);
          // } catch (e) {
          //   toast(e.message, 0, "danger");
          // }
        }
      }
      else {
        setState("started");
      }
    })();
  }, [appReady, loggedIn, holdOnboarding, walletCreated]);

  const screenOptions: StackNavigationOptions = {
    ...useStackNavigationOptions(),
    gestureEnabled: false,
    gestureDirection: "horizontal",
    gestureVelocityImpact: 1.9,
  };

  const animationDisabled: StackNavigationOptions = {
    animationEnabled: false,
    cardStyleInterpolator: CardStyleInterpolators.forNoAnimation,
  };

  const horizontalTransition: StackNavigationOptions = {
    gestureEnabled: true,
    cardStyleInterpolator: CardStyleInterpolators.forHorizontalIOS,
  };

  if (state === "init") {
    if (torLoading) {
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
          <H1>Initializing Tor</H1>
        </Container>
      );
    }
    return (
      <>
        <StatusBar
          backgroundColor="transparent"
          hidden={false}
          translucent={true}
          networkActivityIndicatorVisible={true}
          barStyle="light-content"
        />
      </>
    );
  }

  if (state === "authentication") {
    return (<Authentication />);
  }

  return (
    <RootStack.Navigator initialRouteName={initialRoute} screenOptions={screenOptions}>
      <RootStack.Screen name="Welcome" component={Welcome} options={PLATFORM === "ios" ? {
        gestureEnabled: true,
        cardStyleInterpolator: CardStyleInterpolators.forHorizontalIOS,
      } : animationDisabled} />
      <RootStack.Screen name="Loading" component={Loading} options={animationDisabled} />
      <RootStack.Screen name="LoadingModal" component={LoadingModal} options={animationDisabled} />
      <RootStack.Screen name="CameraFullscreen" component={CameraFullscreen} options={{
        gestureEnabled: true,
        cardStyleInterpolator: CardStyleInterpolators.forHorizontalIOS,
      }} />

      <RootStack.Screen name="Overview" component={Overview} options={animationDisabled} />
      <RootStack.Screen name="Help" component={Help} options={animationDisabled} />
      <RootStack.Screen name="TransactionDetails" component={TransactionDetails as any} options={animationDisabled} />
      <RootStack.Screen name="SyncInfo" component={SyncInfo} options={animationDisabled} />
      <RootStack.Screen name="Receive" component={Receive} options={horizontalTransition} />
      <RootStack.Screen name="Send" component={Send} options={{
        animationEnabled: true,
        gestureEnabled: true,
        gestureResponseDistance: 1000,
        cardStyleInterpolator: CardStyleInterpolators.forHorizontalIOS,
      }} />
      <RootStack.Screen name="OnChain" component={OnChain} options={horizontalTransition} />
      <RootStack.Screen name="LightningInfo" component={LightningInfo} options={horizontalTransition} />
      <RootStack.Screen name="Settings" component={Settings} options={horizontalTransition} />
      <RootStack.Screen name="LNURL" component={LNURL} options={animationDisabled} />
      <RootStack.Screen name="WebLNBrowser" component={WebLNBrowser} options={animationDisabled} />
      <RootStack.Screen name="WebInfo" component={WebInfo} options={animationDisabled} />
      <RootStack.Screen name="Contacts" component={Contacts} options={horizontalTransition} />

      <RootStack.Screen name="GoogleDriveTestbed" component={GoogleDriveTestbed} options={animationDisabled} />
      <RootStack.Screen name="KeysendTest" component={KeysendTest} options={animationDisabled} />
      <RootStack.Screen name="KeysendExperiment" component={KeysendExperiment} options={horizontalTransition} />
      <RootStack.Screen name="DEV_CommandsX" component={DEV_Commands} options={animationDisabled} />
    </RootStack.Navigator>
  );
};

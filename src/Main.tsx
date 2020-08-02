import React, { useEffect, useState } from "react";
import { Spinner, H1 } from "native-base";
import { StatusBar } from "react-native";
import { createStackNavigator, TransitionSpecs, CardStyleInterpolators, StackNavigationOptions } from "@react-navigation/stack";

import Overview from "./windows/Overview";
import Help from "./windows/Help";
import Send from "./windows/Send";
import Receive from "./windows/Receive";
import Settings from "./windows/Settings";
import LightningInfo from "./windows/LightningInfo";
import OnChain from "./windows/OnChain";
import Authentication from "./windows/InitProcess/Authentication";
import DEV_Commands from "./windows/InitProcess/DEV_Commands";
import Welcome from "./windows/Welcome";
import LNURL from "./windows/LNURL";
import KeysendTest from "./windows/Keysend/Test";
import GoogleDriveTestbed from "./windows/Google/GoogleDriveTestbed";
import TransactionDetails from "./windows/TransactionDetails";
import SyncInfo from "./windows/SyncInfo";
import WebLNBrowser from "./windows/WebLN/Browser";
import Loading from "./windows/Loading";

import { useStoreState, useStoreActions } from "./state/store";
import { toast } from "./utils";
import CameraFullscreen from "./windows/CameraFullscreen";

import { blixtTheme } from "../native-base-theme/variables/commonColor";
import Container from "./components/Container";
import { NAVIGATION_SCREEN_OPTIONS } from "./utils/constants";

const RootStack = createStackNavigator();

export type RootStackParamList = {
  DEV_Commands: undefined;
  Init: undefined;
  Authentication: undefined;
  InitLightning: undefined;

  Loading: undefined;
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
  DeeplinkChecker: undefined;
  WebLNBrowser: {
    url: string;
  } | undefined;

  DEV_CommandsX: undefined;
}

export default function Main() {
  const holdOnboarding = useStoreState((store) => store.holdOnboarding);
  const appReady = useStoreState((store) => store.appReady);
  const walletCreated = useStoreState((store) => store.walletCreated);
  const loggedIn = useStoreState((store) => store.security.loggedIn);
  const initializeApp = useStoreActions((store) => store.initializeApp);
  const initLightning = useStoreActions((store) => store.lightning.initialize);
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
      else {
        setState("started");
        if (!walletCreated) {
          setInitialRoute("Welcome");
        }
        else {
          try {
            await initLightning();
          } catch (e) {
            toast(e.message, 0, "danger");
          }
        }
      }
    })();
  }, [appReady, loggedIn, holdOnboarding, walletCreated]);

  const screenOptions: StackNavigationOptions = {
    ...NAVIGATION_SCREEN_OPTIONS,
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
    return (<></>);
  }

  if (state === "authentication") {
    return (<Authentication />);
  }

  return (
    <RootStack.Navigator initialRouteName={initialRoute} screenOptions={screenOptions}>
      <RootStack.Screen name="Welcome" component={Welcome} />
      <RootStack.Screen name="Loading" component={Loading} />
      <RootStack.Screen name="CameraFullscreen" component={CameraFullscreen} />

      <RootStack.Screen name="Overview" component={Overview} />
      <RootStack.Screen name="Help" component={Help} />
      <RootStack.Screen name="TransactionDetails" component={TransactionDetails} />
      <RootStack.Screen name="SyncInfo" component={SyncInfo} />
      <RootStack.Screen name="Receive" component={Receive} />
      <RootStack.Screen name="Send" component={Send} />
      <RootStack.Screen name="OnChain" component={OnChain} />
      <RootStack.Screen name="LightningInfo" component={LightningInfo} />
      <RootStack.Screen name="Settings" component={Settings} />
      <RootStack.Screen name="LNURL" component={LNURL} />
      <RootStack.Screen name="WebLNBrowser" component={WebLNBrowser} />

      <RootStack.Screen name="GoogleDriveTestbed" component={GoogleDriveTestbed} />
      <RootStack.Screen name="KeysendTest" component={KeysendTest} />
      <RootStack.Screen
        name="DEV_CommandsX"
        component={DEV_Commands}
      />
    </RootStack.Navigator>
  );
};

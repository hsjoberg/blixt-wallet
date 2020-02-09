import React, { useEffect, useState } from "react";
import { createStackNavigator } from "@react-navigation/stack";

import Overview from "./windows/Overview";
import Send from "./windows/Send";
import Receive from "./windows/Receive";
import Settings from "./windows/Settings";
import LightningInfo from "./windows/LightningInfo";
import OnChain from "./windows/OnChain";
import Authentication from "./windows/InitProcess/Authentication";
import DEV_Commands from "./windows/InitProcess/DEV_Commands";
import Welcome from "./windows/Welcome";
import ChannelRequest from "./windows/LNURL/ChannelRequest";
import KeysendTest from "./windows/Keysend/Test";
import GoogleDriveTestbed from "./windows/Google/GoogleDriveTestbed";
import TransactionDetails from "./windows/TransactionDetails";
import Loading from "./windows/Loading";

import { useStoreState, useStoreActions } from "./state/store.ts";

const RootStack = createStackNavigator();

export type RootStackParamList = {
  DEV_Commands: undefined;
  Init: undefined;
  Authentication: undefined;
  InitLightning: undefined;

  Overview: undefined;
  TransactionDetails: {
    rHash: string; // TODO
  };
  Receive: undefined;
  Send: undefined;
  OnChain: undefined;
  Settings: undefined;
  ChannelRequest: undefined;
  GoogleDriveTestbed: undefined;
  KeysendTest: undefined;
  DeeplinkChecker: undefined;

  DEV_CommandsX: undefined;
}

export default () => {
  const holdOnboarding = useStoreState((store) => store.holdOnboarding);
  const appReady = useStoreState((store) => store.appReady);
  const walletCreated = useStoreState((store) => store.walletCreated);
  const loggedIn = useStoreState((store) => store.security.loggedIn);
  const initializeApp = useStoreActions((store) => store.initializeApp);
  const initLightning = useStoreActions((store) => store.lightning.initialize);
  const deeplinkChecker = useStoreActions((store) => store.deeplinkChecker);
  const [initialRoute, setInitialRoute] = useState("Overview");

  const [state, setState] =
    useState<"init" | "initLightning" | "authentication" | "onboarding" | "started">("init");

  useEffect(() => {
    // tslint:disable-next-line
    (async () => {
      if (!appReady) {
        await initializeApp();
      }
    })();
  }, [appReady]);

  useEffect(() => {
    // tslint:disable-next-line
    (async () => {
      if (appReady) {
        if (!walletCreated) {
          setState("onboarding");
        }
        else if (!loggedIn) {
          setState("authentication");
        }
        else {
          console.log("else?");
          if (walletCreated && !holdOnboarding) {
            // setState("initLightning");
            await initLightning();
            if (await deeplinkChecker()) {
              setInitialRoute("SendConfirmation");
            }
            setState("started");
          }
        }
      }
    })();
  }, [appReady, loggedIn, holdOnboarding, walletCreated]);

  const screenOptions = {
    gestureEnabled: false,
    headerShown: false,
    animationEnabled: false,
    cardStyle: {
      backgroundColor: "transparent",
    },
  };

  // Initialization
  if (state === "init" || state === "initLightning") {
    return (<Loading />);
  }
  if (state === "onboarding") {
    return (<Welcome />);
  }
  if (state === "authentication") {
    return (<Authentication />);
  }

  return (
    <RootStack.Navigator initialRouteName={"Start"} screenOptions={screenOptions}>
      <RootStack.Screen name="Start">{({navigation}) => {
        if (initialRoute === "Overview") {
          navigation.replace(initialRoute);
        }
        else if (initialRoute === "SendConfirmation") {
          navigation.replace("Overview");
          navigation.push("Send", {screen: initialRoute });
        }

        return null;
      }}</RootStack.Screen>
      <RootStack.Screen name="Overview" component={Overview} />
      <RootStack.Screen name="TransactionDetails" component={TransactionDetails} />
      <RootStack.Screen name="Receive" component={Receive} />
      <RootStack.Screen name="Send" component={Send} />
      <RootStack.Screen name="OnChain" component={OnChain} />
      <RootStack.Screen name="LightningInfo" component={LightningInfo} />
      <RootStack.Screen name="Settings" component={Settings} />
      <RootStack.Screen name="ChannelRequest" component={ChannelRequest} />

      <RootStack.Screen name="GoogleDriveTestbed" component={GoogleDriveTestbed} />
      <RootStack.Screen name="KeysendTest" component={KeysendTest} />

      <RootStack.Screen
        name="DEV_CommandsX"
        component={DEV_Commands}
      />
    </RootStack.Navigator>
  );
};

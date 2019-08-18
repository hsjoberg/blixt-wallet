import React, { useRef, useEffect, useLayoutEffect } from "react";
import { Animated, Easing, StyleSheet } from "react-native";
import { View, Text, Spinner, Root } from "native-base";
import { createBottomTabNavigator, createAppContainer, createStackNavigator, createSwitchNavigator } from "react-navigation";

import { blixtTheme } from "../native-base-theme/variables/commonColor";

import { useStoreState } from "./state/store";
import FooterNav from "./components/FooterNav";
import Overview from "./windows/Overview";
import Send from "./windows/Send";
import Receive from "./windows/Receive";
import Settings from "./windows/Settings";
import LightningInfo from "./windows/LightningInfo";
import OnChain from "./windows/OnChain";
import Init from "./windows/InitProcess/Init";
import Pincode from "./windows/InitProcess/Pincode";
import DEV_Commands from "./windows/InitProcess/DEV_Commands";
import InitLightning from "./windows/InitProcess/InitLightning";
import Welcome from "./windows/Welcome";
import LightningNodeInfo from "./windows/Settings/LightningNodeInfo";

import BlurOverlay, { closeOverlay, openOverlay } from "./Blur";
// import BlurOverlay, { closeOverlay, openOverlay } from "react-native-blur-overlay";
import TransactionDetails from "./windows/TransactionDetails";
import OnChainTransactionDetails from "./windows/OnChain/OnChainTransactionDetails";

const MainStack = createBottomTabNavigator({
  Overview,
}, {
  initialRouteName: "Overview",
  tabBarComponent: FooterNav,
});

const StackNavigator = createStackNavigator({
  Main: {
    screen: MainStack,
  },
  TransactionDetails : {
    screen: TransactionDetails,
  },
  OnChainTransactionDetails: {
    screen: OnChainTransactionDetails,
  },
  LightningNodeInfo,
  Receive,
  Send,
  Settings,
  LightningInfo,
  OnChain,
}, {
  transparentCard: true,
  cardStyle: {
    backgroundColor: "transparent",
    opacity: 1.0,
  },
  initialRouteName: "Main",
  transitionConfig : () => ({
    screenInterpolator: (sceneProps) => {
      return null;
    },
    transitionSpec: {
      duration: 0,
      timing: Animated.timing,
      easing: Easing.step0,
    },
  }),
  mode: "modal",
  headerMode: "none",
});

const RootStack = createSwitchNavigator({
  DEV_Commands,
  Welcome,
  Init,
  Pincode,
  InitLightning,
  Main: { screen: StackNavigator },
}, {
  initialRouteName: __DEV__ ? "DEV_Commands" : "Init",
});

const AppContainer = createAppContainer(RootStack);

export default () => (
  <Root>
    <AppContainer />
  </Root>
);

// export default () => {
//   const lndRestarting = useStoreState((store) => store.lndRestarting);
//
//   useEffect(() => {
//     lndRestarting
//       ? setTimeout(() => openOverlay(), 1)
//       : setTimeout(() => closeOverlay(), 1);
//   }, [lndRestarting]);
//
//   return (
//     <View style={styles.container}>
//       {lndRestarting &&
//         <BlurOverlay
//           radius={15}
//           downsampling={2.07}
//           brightness={0}
//           fadeDuration={0}
//           customStyles={{ alignItems: "center", justifyContent: "center" }}
//           blurStyle="dark"
//           children={
//             <Spinner color={blixtTheme.light} size={64} />
//           }
//         />
//       }
//       <AppContainer />
//     </View>
//   );
// };

const styles = StyleSheet.create({
  container: {
    height: "100%",
    backgroundColor: blixtTheme.dark,
  },
});

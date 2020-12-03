import Color from "color";
import { StackNavigationOptions, StackCardInterpolationProps } from "@react-navigation/stack";

import { useStoreState } from "../state/store";
import { blixtTheme } from "../../native-base-theme/variables/commonColor";
import { Chain } from "../utils/build";

const forFade = ({ current, next, index, closing }: StackCardInterpolationProps) => {
  const opacity = current.progress.interpolate({
    inputRange: [0, index],
    outputRange: [0, 1],
  });

  return {
    cardStyle: {
      opacity,
    },
  };
};

export default function useStackNavigationOptions(): StackNavigationOptions {
  const screenTransitionsEnabled = useStoreState((store) => store.settings.screenTransitionsEnabled);

  return {
    gestureEnabled: false,
    headerShown: false,
    cardStyle: {
      backgroundColor: "transparent",
    },
    headerStyle: {
      backgroundColor: Chain === "mainnet" ? blixtTheme.primary : Color(blixtTheme.lightGray).darken(0.30).hex(),
      elevation: 0,
      shadowColor: "transparent",
    },
    headerTitleStyle: {
      color: blixtTheme.light
    },
    headerTintColor: blixtTheme.light,
    headerPressColorAndroid: blixtTheme.light,
    headerRightContainerStyle: {
      marginRight: 20,
    },

    animationEnabled: screenTransitionsEnabled,
    // cardStyleInterpolator: CardStyleInterpolators.forVerticalIOS,
    cardStyleInterpolator: forFade,
    cardOverlayEnabled: false,
    // animationTypeForReplace: "pop",
  };
}
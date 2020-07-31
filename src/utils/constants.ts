import { StackNavigationOptions } from "@react-navigation/stack";
import { blixtTheme } from "../../native-base-theme/variables/commonColor";

export const TLV_RECORD_NAME = 128100;
export const MAX_SAT_INVOICE = 4294967;

export const GITHUB_REPO_URL = "https://github.com/hsjoberg/blixt-wallet";
export const HAMPUS_EMAIL = "mailto:hampus.sjoberg💩protonmail.com".replace("💩", "@");

export const NAVIGATION_SCREEN_OPTIONS: StackNavigationOptions = {
  gestureEnabled: false,
  headerShown: false,
  animationEnabled: false,
  cardStyle: {
    backgroundColor: "transparent",
  },
  headerStyle: {
    backgroundColor: blixtTheme.primary,
  },
  headerTitleStyle: {
    color: blixtTheme.light
  },
  headerTintColor: blixtTheme.light,
  headerPressColorAndroid: blixtTheme.light,
  headerRightContainerStyle: {
    marginRight: 20,
  },
};

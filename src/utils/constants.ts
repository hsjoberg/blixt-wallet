import { Platform, StatusBar } from "react-native";
import { getStatusBarHeight } from "react-native-status-bar-height";
import { Chain } from "./build";
import { chainSelect } from "./chain-select";
import { zoomed } from "./scale";

export const TLV_RECORD_NAME = 128101;
export const TLV_KEYSEND = 5482373484;
export const TLV_WHATSAT_MESSAGE = 34349334;

export const MAX_SAT_INVOICE = 4294967;

export const GITHUB_REPO_URL = "https://github.com/hsjoberg/blixt-wallet";
export const HAMPUS_EMAIL = "mailto:hampus.sjoberg💩protonmail.com".replace("💩", "@");
export const TELEGRAM = "https://t.me/blixtwallet";

export const PLATFORM = Platform.OS;

export const MATH_PAD_NATIVE_ID = "MATH_PAD";

export const DEFAULT_NEUTRINO_NODE = Chain === "mainnet" ? "node.blixtwallet.com" : "testnet.blixtwallet.com";
export const DEFAULT_INVOICE_EXPIRY = 3600;

export const ANDROID_PUSH_NOTIFICATION_PUSH_CHANNEL_ID = "common";
export const ANDROID_PUSH_NOTIFICATION_PUSH_CHANNEL_NAME = "Common notifications";

export const DEFAULT_DUNDER_SERVER = chainSelect({
  mainnet: "https://dunder.blixtwallet.com",
  testnet: "https://testnetdunder.blixtwallet.com",
  regtest: "http://192.168.1.111:8080",
});

export const HEADER_MIN_HEIGHT = Platform.select({
  android: (StatusBar.currentHeight ?? 0) + 53,
  ios: getStatusBarHeight(true) + 53,
  macos: 53
}) ?? 53;

export const HEADER_MAX_HEIGHT = (Platform.select({
  android: 195,
  ios: 195,
  web: 195 - 32,
  macos: 175
}) ?? 195) / (zoomed ? 0.85 : 1);

import { Platform } from "react-native";
import { Chain } from "./build";
import { chainSelect } from "./chain-select";

export const TLV_RECORD_NAME = 128100;
export const TLV_KEYSEND = 5482373484;
export const TLV_WHATSAT_MESSAGE = 34349334;

export const MAX_SAT_INVOICE = 4294967;

export const GITHUB_REPO_URL = "https://github.com/hsjoberg/blixt-wallet";
export const HAMPUS_EMAIL = "mailto:hampus.sjoberg💩protonmail.com".replace("💩", "@");
export const TELEGRAM = "https://t.me/blixtwallet";

export const PLATFORM = Platform.OS;

export const MATH_PAD_NATIVE_ID = "MATH_PAD";

export const DEFAULT_NEUTRINO_NODE = Chain === "mainnet" ? "node.blixtwallet.com" : "testnet.blixtwallet.com";

export const ANDROID_PUSH_NOTIFICATION_PUSH_CHANNEL_ID = "common";
export const ANDROID_PUSH_NOTIFICATION_PUSH_CHANNEL_NAME = "Common notifications";

export const DEFAULT_DUNDER_SERVER = chainSelect({
  mainnet: "https://dunder.blixtwallet.com",
  testnet: "https://testnetdunder.blixtwallet.com",
  regtest: "http://192.168.1.111:8080",
});

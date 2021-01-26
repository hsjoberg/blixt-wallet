import { Platform } from "react-native";
import { Chain } from "./build";

export const TLV_RECORD_NAME = 128100;
export const MAX_SAT_INVOICE = 4294967;

export const GITHUB_REPO_URL = "https://github.com/hsjoberg/blixt-wallet";
export const HAMPUS_EMAIL = "mailto:hampus.sjoberg💩protonmail.com".replace("💩", "@");
export const TELEGRAM = "https://t.me/blixtwallet";

export const PLATFORM = Platform.OS;

export const MATH_PAD_NATIVE_ID = "MATH_PAD";

export const DEFAULT_NEUTRINO_NODE = Chain === "mainnet" ? "btcd-mainnet.lightning.computer" : "testnet.teslacoil.io";

import { Platform } from "react-native";
import BuildConfig from "react-native-build-config";

console.log("BuildConfig", BuildConfig);

export const Flavor: string = Platform.select({
  android: BuildConfig.FLAVOR_custom,
  ios: BuildConfig.FLAVOR,
  macos: BuildConfig.FLAVOR,
  web: BuildConfig.FLAVOR,
});

export const Debug: boolean = Platform.select({
  android: BuildConfig.DEBUG,
  ios: BuildConfig.DEBUG === "true",
  macos: BuildConfig.DEBUG === "true",
  web: BuildConfig.DEBUG,
});

export const VersionCode: number = Platform.select({
  android: BuildConfig.VERSION_CODE,
  ios: Number.parseInt(BuildConfig.CFBundleVersion, 10),
  macos: Number.parseInt(BuildConfig.CFBundleVersion, 10),
  web: BuildConfig.VERSION_CODE,
});

export const BuildType: string = Platform.select({
  android: BuildConfig.BUILD_TYPE,
  ios: Debug ? "debug" : "release",
  macos: Debug ? "debug" : "release",
  web: BuildConfig.BUILD_TYPE,
});

export const ApplicationId: string = Platform.select({
  android: BuildConfig.APPLICATION_ID,
  ios: BuildConfig.CFBundleIdentifier,
  macos: BuildConfig.CFBundleIdentifier,
  web: BuildConfig.APPLICATION_ID,
});

export const VersionName: string = Platform.select({
  android: BuildConfig.VERSION_NAME,
  ios: BuildConfig.CFBundleShortVersionString,
  macos: BuildConfig.CFBundleShortVersionString,
  web: BuildConfig.VERSION_NAME,
});

export const AppleTeamId: string = ["ios", "macos"].includes(Platform.OS) ? BuildConfig.TEAM_ID : "";

export const IsHermes: boolean = (global as any).HermesInternal != null;

export const Chain: "mainnet" | "testnet" | "regtest" = BuildConfig.CHAIN;

export const LnBech32Prefix = (Chain === "mainnet" || Chain === "regtest")
  ? "lnbc"
  : "lntb";

import BuildConfig from "react-native-build-config";

export const Flavor: string = BuildConfig.FLAVOR;
export const Debug: boolean = BuildConfig.DEBUG;
export const VersionCode: number = BuildConfig.VERSION_CODE;
export const BuildType: string = BuildConfig.BUILD_TYPE;
export const ApplicationId: string = BuildConfig.APPLICATION_ID;
export const VersionName: string = BuildConfig.VERSION_NAME;
export const IsHermes: boolean = global.HermesInternal != null;

export const Chain: "mainnet" | "testnet" = BuildConfig.CHAIN;

export const LnBech32Prefix = Chain === "mainnet"
  ? "lnbc"
  : "lntb";

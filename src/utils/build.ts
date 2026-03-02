import { Platform } from "react-native";

type BuildChain = "mainnet" | "testnet" | "regtest" | "signet";

type NativeBuildConfigModule = {
  getFlavor(): string;
  getDebug(): boolean;
  getVersionCode(): number;
  getBuildType(): string;
  getApplicationId(): string;
  getVersionName(): string;
  getAppleTeamId(): string;
  getChain(): BuildChain | string;
};

type BuildConfigValues = {
  flavor: string;
  debug: boolean;
  versionCode: number;
  buildType: string;
  applicationId: string;
  versionName: string;
  appleTeamId: string;
  chain: BuildChain | string;
};

const isWeb = Platform.OS === "web";
const webGlobals = globalThis as Record<string, unknown>;

const asString = (value: unknown, fallback = ""): string =>
  typeof value === "string" ? value : fallback;

const asBoolean = (value: unknown, fallback = false): boolean => {
  if (typeof value === "boolean") {
    return value;
  }
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (normalized === "true" || normalized === "1" || normalized === "yes") {
      return true;
    }
    if (normalized === "false" || normalized === "0" || normalized === "no") {
      return false;
    }
  }
  return fallback;
};

const asNumber = (value: unknown, fallback = 0): number => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string") {
    const parsed = Number.parseInt(value, 10);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return fallback;
};

const buildConfig: BuildConfigValues = isWeb
  ? {
      flavor: asString(webGlobals.FLAVOR),
      debug: asBoolean(webGlobals.DEBUG),
      versionCode: asNumber(webGlobals.VERSION_CODE),
      buildType: asString(webGlobals.BUILD_TYPE),
      applicationId: asString(webGlobals.APPLICATION_ID),
      versionName: asString(webGlobals.VERSION_NAME),
      appleTeamId: "",
      chain: asString(webGlobals.CHAIN, "mainnet"),
    }
  : (() => {
      const nativeBuildConfigModule = require("../turbomodules/NativeBlixtTools")
        .default as NativeBuildConfigModule;
      return {
        flavor: nativeBuildConfigModule.getFlavor(),
        debug: nativeBuildConfigModule.getDebug(),
        versionCode: nativeBuildConfigModule.getVersionCode(),
        buildType: nativeBuildConfigModule.getBuildType(),
        applicationId: nativeBuildConfigModule.getApplicationId(),
        versionName: nativeBuildConfigModule.getVersionName(),
        appleTeamId: nativeBuildConfigModule.getAppleTeamId(),
        chain: nativeBuildConfigModule.getChain(),
      };
    })();

const isBuildChain = (value: string): value is BuildChain =>
  value === "mainnet" || value === "testnet" || value === "regtest" || value === "signet";

export const Flavor = buildConfig.flavor;
export const Debug = buildConfig.debug;
export const VersionCode = buildConfig.versionCode;
export const BuildType = buildConfig.buildType;
export const ApplicationId = buildConfig.applicationId;
export const VersionName = buildConfig.versionName;
export const AppleTeamId = buildConfig.appleTeamId;
export const IsHermes: boolean = (global as any).HermesInternal != null;
export const Chain: BuildChain = isBuildChain(buildConfig.chain) ? buildConfig.chain : "mainnet";
export const LnBech32Prefix = Chain === "mainnet" || Chain === "regtest" ? "lnbc" : "lntb";

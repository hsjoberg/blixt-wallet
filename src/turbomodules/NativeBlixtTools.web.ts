import type { CodegenTypes } from "react-native";

import type { BuildChain, Spec } from "./NativeBlixtTools";

const chain = ((globalThis as Record<string, unknown>).CHAIN ?? "mainnet") as BuildChain;
const debug = Boolean((globalThis as Record<string, unknown>).DEBUG ?? false);
const flavor = String((globalThis as Record<string, unknown>).FLAVOR ?? "fakelnd");
const applicationId = String(
  (globalThis as Record<string, unknown>).APPLICATION_ID ?? "com.blixtwallet.webdemo",
);
const versionName = String((globalThis as Record<string, unknown>).VERSION_NAME ?? "0.9.0-web");
const versionCode = Number((globalThis as Record<string, unknown>).VERSION_CODE ?? 0);
const buildType = String((globalThis as Record<string, unknown>).BUILD_TYPE ?? "debug");

const eventEmitter = ((_: (payload: string) => void) => ({
  remove() {},
})) as CodegenTypes.EventEmitter<string>;

const NativeBlixtToolsWeb: Spec = {
  getFlavor: () => flavor,
  getDebug: () => debug,
  getVersionCode: () => versionCode,
  getBuildType: () => buildType,
  getApplicationId: () => applicationId,
  getVersionName: () => versionName,
  getAppleTeamId: () => "",
  getChain: () => chain,

  writeConfig: async () => "",
  generateSecureRandomAsBase64: async (length) => {
    const data = new Uint8Array(length);
    crypto.getRandomValues(data);
    return btoa(String.fromCharCode(...data));
  },
  log: (_level, tag, message) => {
    console.log(`${tag}: ${message}`);
  },
  saveLogs: async () => "",
  copyLndLog: async () => false,
  copySpeedloaderLog: async () => false,
  tailLog: async () => "",
  observeLndLogFile: async () => false,
  tailSpeedloaderLog: async () => "",
  saveChannelsBackup: async () => false,
  saveChannelBackupFile: async () => false,
  getTorEnabled: async () => false,
  DEBUG_deleteSpeedloaderLastrunFile: async () => true,
  DEBUG_deleteSpeedloaderDgraphDirectory: async () => true,
  DEBUG_deleteNeutrinoFiles: async () => true,
  getInternalFiles: async () => ({}),
  getCacheDir: async () => "/tmp",
  getFilesDir: async () => "/",
  getAppFolderPath: async () => "/",
  saveChannelDbFile: async () => false,
  importChannelDbFile: async () => false,
  getIntentStringData: async () => null,
  getIntentNfcData: async () => null,
  DEBUG_deleteWallet: async () => true,
  DEBUG_deleteDatafolder: async () => true,
  restartApp: () => {
    location.reload();
  },
  checkICloudEnabled: async () => false,
  checkApplicationSupportExists: async () => true,
  createIOSApplicationSupportAndLndDirectories: async () => true,
  excludeLndICloudBackup: async () => true,
  macosOpenFileDialog: async () => null,
  onLndLog: eventEmitter,
};

export default NativeBlixtToolsWeb;

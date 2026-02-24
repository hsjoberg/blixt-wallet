import { toByteArray as base64ToByteArray } from "base64-js";
import { NativeModules } from "react-native";

import Speedloader from "../turbomodules/NativeSpeedloader";

const { LndMobileTools } = NativeModules;

/**
 * @throws
 * @return string
 */
export const writeConfig = async (data: string) => {
  return await LndMobileTools.writeConfig(data);
};

/**
 * @throws
 * @return string
 */
export const writeConfigFile = async () => {
  return await LndMobileTools.writeConfigFile();
};

/**
 * @throws
 * @return string
 */
export const generateSecureRandomAsBase64 = async (length: number) => {
  return await LndMobileTools.generateSecureRandomAsBase64(length);
};

export const generateSecureRandom = async (length: number) => {
  const randomBase64 = await generateSecureRandomAsBase64(length);
  return base64ToByteArray(randomBase64);
};

/**
 * @throws
 */
export const gossipSync = async (
  serviceUrl: string,
  _networkType: string,
): Promise<{ data: string }> => {
  const [cacheDir, filesDir] = await Promise.all([
    LndMobileTools.getCacheDir(),
    LndMobileTools.getFilesDir(),
  ]);
  const data = await Speedloader.gossipSync(serviceUrl, cacheDir, filesDir);
  return { data };
};

export const checkICloudEnabled = async (): Promise<boolean> => {
  return await LndMobileTools.checkICloudEnabled();
};

/**
 * @throws
 */
export const checkApplicationSupportExists = async () => {
  return await LndMobileTools.checkApplicationSupportExists();
};

/**
 * @throws
 */
export const checkLndFolderExists = async () => {
  return await LndMobileTools.checkLndFolderExists();
};

/**
 * @throws
 */
export const createIOSApplicationSupportAndLndDirectories = async () => {
  return await LndMobileTools.createIOSApplicationSupportAndLndDirectories();
};

/**
 * @throws
 */
export const excludeLndICloudBackup = async () => {
  return await LndMobileTools.excludeLndICloudBackup();
};

/**
 * @throws
 */

export type IReadLndLogResponse = string[];
/**
 * @throws
 * TODO remove
 */
export const readLndLog = async (): Promise<IReadLndLogResponse> => {
  return [""];
};

import { toByteArray as base64ToByteArray } from "base64-js";

import NativeBlixtTools from "../turbomodules/NativeBlixtTools";
import Speedloader from "../turbomodules/NativeSpeedloader";

/**
 * @throws
 * @return string
 */
export const writeConfig = async (data: string) => {
  return await NativeBlixtTools.writeConfig(data);
};

/**
 * @throws
 * @return string
 */
export const generateSecureRandomAsBase64 = async (length: number) => {
  return await NativeBlixtTools.generateSecureRandomAsBase64(length);
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
    NativeBlixtTools.getCacheDir(),
    NativeBlixtTools.getFilesDir(),
  ]);
  const data = await Speedloader.gossipSync(serviceUrl, cacheDir, filesDir);
  return { data };
};

export const checkICloudEnabled = async (): Promise<boolean> => {
  return await NativeBlixtTools.checkICloudEnabled();
};

/**
 * @throws
 */
export const checkApplicationSupportExists = async () => {
  return await NativeBlixtTools.checkApplicationSupportExists();
};

/**
 * @throws
 */
export const createIOSApplicationSupportAndLndDirectories = async () => {
  return await NativeBlixtTools.createIOSApplicationSupportAndLndDirectories();
};

/**
 * @throws
 */
export const excludeLndICloudBackup = async () => {
  return await NativeBlixtTools.excludeLndICloudBackup();
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

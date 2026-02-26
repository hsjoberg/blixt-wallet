import { toByteArray as base64ToByteArray } from "base64-js";

import { NativeModules } from "react-native";

const { LndMobile, LndMobileTools } = NativeModules;

/**
 * @throws
 */
export const initialize = async (): Promise<{ data: string } | number> => {
  return await LndMobile.initialize();
};

export enum ELndMobileStatusCodes {
  STATUS_SERVICE_BOUND = 1,
  STATUS_PROCESS_STARTED = 2,
  STATUS_WALLET_UNLOCKED = 4,
}

export const checkStatus = async (): Promise<ELndMobileStatusCodes> => {
  return await LndMobile.checkStatus();
};

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
export const startLnd = async (torEnabled: boolean, args?: string): Promise<{ data: string }> => {
  return await LndMobile.startLnd(torEnabled, args);
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
export const TEMP_moveLndToApplicationSupport = async () => {
  return await LndMobileTools.TEMP_moveLndToApplicationSupport();
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

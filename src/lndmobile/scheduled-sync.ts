import { NativeModules } from "react-native";
const { LndMobileScheduledSync } = NativeModules;

export type WorkInfo = "BLOCKED" | "CANCELLED" | "ENQUEUED" | "FAILED" | "RUNNING" | "SUCCEEDED" | "WORK_NOT_EXIST";

export const checkScheduledSyncWorkStatus = async (): Promise<WorkInfo> => {
  return await LndMobileScheduledSync.checkScheduledSyncWorkStatus();
};
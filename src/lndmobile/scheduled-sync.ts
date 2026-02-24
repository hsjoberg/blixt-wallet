import ScheduledSyncTurbo, { WorkInfo } from "../turbomodules/NativeScheduledSyncTurbo";

export const setupScheduledSyncWork = async (): Promise<boolean> => {
  return await ScheduledSyncTurbo.setupScheduledSyncWork();
};

export const removeScheduledSyncWork = async (): Promise<boolean> => {
  return await ScheduledSyncTurbo.removeScheduledSyncWork();
};

export const checkScheduledSyncWorkStatus = async (): Promise<WorkInfo> => {
  return await ScheduledSyncTurbo.checkScheduledSyncWorkStatus();
};

import type { Spec } from "./NativeScheduledSyncTurbo";

const NativeScheduledSyncTurboWeb: Spec = {
  startSyncWorker() {},
  scheduleSyncWorker() {},
  stopScheduleSyncWorker() {},
  setupScheduledSyncWork: async () => true,
  removeScheduledSyncWork: async () => true,
  checkScheduledSyncWorkStatus: async () => "WORK_NOT_EXIST",
};

export default NativeScheduledSyncTurboWeb;

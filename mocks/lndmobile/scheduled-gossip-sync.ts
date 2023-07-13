export type WorkInfo = "BLOCKED" | "CANCELLED" | "ENQUEUED" | "FAILED" | "RUNNING" | "SUCCEEDED" | "WORK_NOT_EXIST";

export const checkScheduledGossipSyncWorkStatus = jest.fn(async (): Promise<WorkInfo> => {
  return "ENQUEUED";
});

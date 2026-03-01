import type { TurboModule } from "react-native";
import { TurboModuleRegistry } from "react-native";

export type WorkInfo =
  | "BLOCKED"
  | "CANCELLED"
  | "ENQUEUED"
  | "FAILED"
  | "RUNNING"
  | "SUCCEEDED"
  | "WORK_NOT_EXIST";

export interface Spec extends TurboModule {
  startSyncWorker(): void;
  scheduleSyncWorker(): void;
  stopScheduleSyncWorker(): void;
  setupScheduledSyncWork(): Promise<boolean>;
  removeScheduledSyncWork(): Promise<boolean>;
  checkScheduledSyncWorkStatus(): Promise<WorkInfo>;
}

export default TurboModuleRegistry.getEnforcing<Spec>("ScheduledSyncTurbo");

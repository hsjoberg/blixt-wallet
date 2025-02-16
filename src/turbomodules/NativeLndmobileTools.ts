import type { TurboModule } from "react-native";
import { TurboModuleRegistry } from "react-native";

export interface Spec extends TurboModule {
  startSyncWorker(): void;
  scheduleSyncWorker(): void;
  stopScheduleSyncWorker(): void;
}

export default TurboModuleRegistry.getEnforcing<Spec>("LndMobileToolsTurbo");

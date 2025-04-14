import type { TurboModule } from "react-native";
import { TurboModuleRegistry } from "react-native";

export interface Spec extends TurboModule {
  gossipSync(serviceUrl: string, cacheDir: string, filesDir: string): Promise<string>;
  cancelGossipSync(): void;
}

export default TurboModuleRegistry.getEnforcing<Spec>("NativeSpeedloaderCxx");

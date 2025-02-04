import { TurboModule, TurboModuleRegistry } from "react-native";

export interface Spec extends TurboModule {
  readonly gossipSync: (serviceUrl: string, cacheDir: string, filesDir: string) => Promise<string>;
}

export default TurboModuleRegistry.getEnforcing<Spec>("NativeSpeedloaderCxx");

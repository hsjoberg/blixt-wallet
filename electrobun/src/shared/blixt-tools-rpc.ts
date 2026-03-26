import type { Spec } from "../../../src/turbomodules/NativeBlixtTools";

type FunctionKeys<T> = {
  [K in keyof T]-?: T[K] extends (...args: any[]) => any ? K : never;
}[keyof T];

type CallableBlixtToolsMethod = Extract<FunctionKeys<Spec>, string>;

export const BlixtToolsElectrobunMethods = [
  "writeConfig",
  "generateSecureRandomAsBase64",
  "log",
  "restartApp",
  "tailLog",
  "observeLndLogFile",
  "tailSpeedloaderLog",
  "DEBUG_deleteSpeedloaderLastrunFile",
  "DEBUG_deleteSpeedloaderDgraphDirectory",
  "getCacheDir",
  "getFilesDir",
  "getAppFolderPath",
] as const satisfies readonly CallableBlixtToolsMethod[];

export type BlixtToolsElectrobunMethod = (typeof BlixtToolsElectrobunMethods)[number];

export type BlixtToolsElectrobunImplementation = Pick<Spec, BlixtToolsElectrobunMethod>;

export type BlixtToolsElectrobunAsyncImplementation = {
  [K in keyof BlixtToolsElectrobunImplementation]: (
    ...args: Parameters<BlixtToolsElectrobunImplementation[K]>
  ) => Promise<Awaited<ReturnType<BlixtToolsElectrobunImplementation[K]>>>;
};

export type BlixtToolsRpcMethodName<
  Method extends BlixtToolsElectrobunMethod = BlixtToolsElectrobunMethod,
> = `__BlixtTools${Capitalize<Method>}`;

export type BlixtToolsRpcParams<Method extends BlixtToolsElectrobunMethod> = Parameters<
  BlixtToolsElectrobunImplementation[Method]
>;

export type BlixtToolsRpcResponse<Method extends BlixtToolsElectrobunMethod> = Awaited<
  ReturnType<BlixtToolsElectrobunImplementation[Method]>
>;

export const toBlixtToolsRpcMethodName = <Method extends BlixtToolsElectrobunMethod>(
  method: Method,
): BlixtToolsRpcMethodName<Method> => {
  return `__BlixtTools${method.charAt(0).toUpperCase()}${method.slice(1)}` as BlixtToolsRpcMethodName<Method>;
};

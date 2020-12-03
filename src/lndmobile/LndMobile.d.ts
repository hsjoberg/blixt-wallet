export enum ELndMobileStatusCodes {
  STATUS_SERVICE_BOUND = 1,
  STATUS_PROCESS_STARTED = 2,
  STATUS_WALLET_UNLOCKED = 4,
}

export interface ILndMobile {
  // General
  init(): Promise<void>;
  checkLndMobileServiceConnected(): Promise<boolean>;
  sendPongToLndMobileservice(): Promise<{ data: string }>;
  checkStatus(): Promise<ELndMobileStatusCodes>;
  writeConfigFile(): Promise<string>;
  startLnd(torEnabled: boolean): Promise<{ data: string }>
  stopLnd(): Promise<{ data: string }>;
  initWallet(seed: string[], password: string, recoveryWindow: number, channelBackupsBase64: string | null): Promise<{ data: string }>;
  unlockWallet(password: string): Promise<{ data: string }>
  killLnd(): Promise<boolean>;
  restartApp(): void;
  saveChannelsBackup(base64Backups: string): Promise<string>;
  log(level: "v" | "d" | "i" | "w" | "e", tag: string, msg: string): void;
  saveLogs(): Promise<string>;
  copyLndLog(): Promise<string>;
  tailLog(numberOfLines: number): Promise<string>;
  getTorEnabled(): Promise<boolean>;
  observeLndLogFile(): Promise<boolean>;
  DEBUG_getWalletPasswordFromKeychain(): Promise<string>;

  // Send gRPC LND API request
  sendCommand(method: string, base64Payload: string): Promise<{ data: string }>;
  sendStreamCommand(method: string, base64Payload: string, streamOnlyOnce: boolean): Promise<"done">;

  // Android-specific
  getIntentStringData(): Promise<string | null>;
  getIntentNfcData(): Promise<string | null>;
  DEBUG_deleteWallet(): Promise<boolean>;
  DEBUG_deleteDatafolder(): Promise<null>;
  DEBUG_listProcesses(): Promise<string>;
  checkLndProcessExist(): Promise<boolean>;
  deleteTLSCerts(): Promise<boolean>;
  unbindLndMobileService(): Promise<void>; // TODO(hsjoberg): function looks broken
}

declare module "react-native" {
  interface NativeModulesStatic {
    LndMobile: ILndMobile;
  }
}
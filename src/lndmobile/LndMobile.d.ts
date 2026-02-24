export interface ILndMobileTools {
  writeConfig(data: string): Promise<string>;
  writeConfigFile(): Promise<string>;
  generateSecureRandomAsBase64(length: number): Promise<string>;
  killLnd(): Promise<boolean>;
  log(level: "v" | "d" | "i" | "w" | "e", tag: string, msg: string): void;
  saveLogs(): Promise<string>;
  copyLndLog(): Promise<boolean>;
  copySpeedloaderLog(): Promise<boolean>;
  tailLog(numberOfLines: number): Promise<string>;
  observeLndLogFile(): Promise<boolean>;
  saveChannelsBackup(base64Backups: string): Promise<string>;
  saveChannelBackupFile(): Promise<boolean>;
  DEBUG_getWalletPasswordFromKeychain(): Promise<string>;
  getTorEnabled(): Promise<boolean>;
  DEBUG_deleteSpeedloaderLastrunFile(): boolean;
  DEBUG_deleteSpeedloaderDgraphDirectory(): null;
  DEBUG_deleteNeutrinoFiles(): boolean;
  getInternalFiles(): Promise<Record<string, number>>;
  getCacheDir(): Promise<string>;
  getFilesDir(): Promise<string>;
  getAppFolderPath(): Promise<string>;
  saveChannelDbFile(): Promise<boolean>;
  importChannelDbFile(channelDbPath: string): Promise<boolean>;

  // Android-specific
  getIntentStringData(): Promise<string | null>;
  getIntentNfcData(): Promise<string | null>;
  DEBUG_deleteWallet(): Promise<boolean>;
  DEBUG_deleteDatafolder(): Promise<null>;
  DEBUG_listProcesses(): Promise<string>;
  checkLndProcessExist(): Promise<boolean>;
  deleteTLSCerts(): Promise<boolean>;
  restartApp(): void;

  // iOS-specific
  checkICloudEnabled(): Promise<boolean>;
  checkApplicationSupportExists(): Promise<boolean>;
  checkLndFolderExists(): Promise<boolean>;
  createIOSApplicationSupportAndLndDirectories(): Promise<boolean>;
  excludeLndICloudBackup(): Promise<boolean>;

  // macOS-specific
  macosOpenFileDialog(): Promise<string | undefined>;
}

export type WorkInfo =
  | "BLOCKED"
  | "CANCELLED"
  | "ENQUEUED"
  | "FAILED"
  | "RUNNING"
  | "SUCCEEDED"
  | "WORK_NOT_EXIST";

export interface ILndMobileScheduledSync {
  setupScheduledSyncWork: () => Promise<boolean>;
  removeScheduledSyncWork: () => Promise<boolean>;
  checkScheduledSyncWorkStatus: () => Promise<WorkInfo>;
}

export interface IGossipFileScheduledSync {
  setupScheduledSyncWork: () => Promise<boolean>;
  removeScheduledSyncWork: () => Promise<boolean>;
  checkScheduledSyncWorkStatus: () => Promise<WorkInfo>;
}

declare module "react-native" {
  interface NativeModulesStatic {
    LndMobileTools: ILndMobileTools;
    LndMobileScheduledSync: ILndMobileScheduledSync;
    GossipFileScheduledSync: IGossipFileScheduledSync;
  }
}

import { DeviceEventEmitter } from "react-native";
import { Action, action, Thunk, thunk } from "easy-peasy";
import * as base64 from "base64-js";
import { differenceInDays } from "date-fns";

import { IStoreInjections } from "./store";
import { IStoreModel } from "../state";
import { waitUntilTrue, timeout } from "../utils";
import { uploadFileAsString, getFiles, checkResponseIsError, downloadFileAsString } from "../utils/google-drive";
import { Chain, Debug } from "../utils/build";
import { getItemObject, StorageItem, setItemObject } from "../storage/app";

import logger from "./../utils/log";
const log = logger("GoogleDriveBackup");

export const GOOGLE_DRIVE_BACKUP_FILE = `blixt-wallet-backup-${Chain}${Debug ? "-debug" : ""}.b64`;

export interface IGoogleDriveBackupModel {
  initialize: Thunk<IGoogleDriveBackupModel, void, any, IStoreModel>;

  setupChannelUpdateSubscriptions: Thunk<IGoogleDriveBackupModel, void, IStoreInjections, IStoreModel>;
  setChannelUpdateSubscriptionStarted: Action<IGoogleDriveBackupModel, boolean>;

  makeBackup: Thunk<IGoogleDriveBackupModel, void, IStoreInjections, IStoreModel>;

  getBackupFile: Thunk<IGoogleDriveBackupModel, void, IStoreInjections, IStoreModel, Promise<string>>;

  channelUpdateSubscriptionStarted: boolean;
};

export const googleDriveBackup: IGoogleDriveBackupModel = {
  initialize: thunk(async (actions, _, { getState, getStoreState }) => {
    log.d("Initializing");
    if (!getState().channelUpdateSubscriptionStarted) {
      await actions.setupChannelUpdateSubscriptions();
    }

    // Automatically backup every 3 days
    // tslint:disable-next-line: no-floating-promises
    (async () => {
      if (getStoreState().settings.googleDriveBackupEnabled) {
        let lastGoogleDriveBackup = await getItemObject<number>(StorageItem.lastGoogleDriveBackup);
        log.d("lastGoogleDriveBackup", [lastGoogleDriveBackup]);
        lastGoogleDriveBackup = lastGoogleDriveBackup - (60 * 60 * 24 * 1000);
        const currentDate = new Date().getTime();
        const diff = differenceInDays(currentDate, lastGoogleDriveBackup);
        if (diff >= 3) {
          log.i(">= 3 days since last Google Drive backup");
          await waitUntilTrue(() => getStoreState().lightning.rpcReady);
          await timeout(2500);
          await actions.makeBackup();
          await setItemObject<number>(StorageItem.lastGoogleDriveBackup, currentDate);
        }
      }
    })();
    log.d("Done");
  }),

  setupChannelUpdateSubscriptions: thunk((actions, _2, { getStoreState, injections }) => {
    log.i("Starting channel update subscription for Google Drive channel backup");

    DeviceEventEmitter.addListener("SubscribeChannelEvents", async (e: any) => {
      if (!getStoreState().settings.googleDriveBackupEnabled || !getStoreState().google.isSignedIn) {
        return;
      }
      log.d("GoogleDriveBackup: Received SubscribeChannelEvents");
      const decodeChannelEvent = injections.lndMobile.channel.decodeChannelEvent;
      const channelEvent = decodeChannelEvent(e.data);
      if (channelEvent.openChannel || channelEvent.closedChannel) {
        log.i("New channel event received, starting new Google Drive backup");
        await actions.makeBackup();
      }
    });
    actions.setChannelUpdateSubscriptionStarted(true);
  }),

  makeBackup: thunk(async (_, _2, { getStoreActions, injections }) => {
    const exportAllChannelBackups = injections.lndMobile.channel.exportAllChannelBackups;
    const backup = await exportAllChannelBackups();
    const backupsB64 = base64.fromByteArray(backup.multiChanBackup!.multiChanBackup!);
    const accessToken = (await getStoreActions().google.getTokens()).accessToken;

    const files = await getFiles(accessToken, [GOOGLE_DRIVE_BACKUP_FILE]);
    if (checkResponseIsError(files)) {
      throw new Error(`Error backing up channels to Google Drive. ${JSON.stringify(files)}`);
    }
    else {
      // files.files[0] will be undefined if this is the first
      // time an upload is triggered, so we pass in undefined
      // to create a new file.
      const uploadResult = await uploadFileAsString(accessToken, {
        name: GOOGLE_DRIVE_BACKUP_FILE,
        description: "Base64-encoded channel backup for Blixt Wallet",
        mimeType: "application/base64",
      }, backupsB64, files.files[0] ? files.files[0].id : undefined);

      if (checkResponseIsError(uploadResult)) {
        throw new Error(`Error backing up channels to Google Drive. ${JSON.stringify(uploadResult)}`);
      }
      else {
        log.i("Backing up channels to Google Drive succeeded");
        log.d("uploadResult", [uploadResult]);
        return uploadResult;
      }
    }
  }),

  getBackupFile: thunk(async (_, _2, { getStoreActions }) => {
    const accessToken = (await getStoreActions().google.getTokens()).accessToken;

    const files = await getFiles(accessToken, [GOOGLE_DRIVE_BACKUP_FILE]);
    if (checkResponseIsError(files)) {
      log.e("Got error when getting backup metadata", [files]);
      throw new Error(files.error.message); // TODO
    }

    if (files.files.length === 0) {
      throw new Error("No backup file available.");
    }

    const backupB64 = await downloadFileAsString(accessToken, files.files[0].id);
    if (checkResponseIsError(backupB64)) {
      log.e("Got error when downloading backup", [backupB64]);
      throw new Error(backupB64.error.message);
    }
    else {
      log.i("Download succeeded");
      return backupB64;
    }
  }),

  setChannelUpdateSubscriptionStarted: action((state, payload) => { state.channelUpdateSubscriptionStarted = payload; }),

  channelUpdateSubscriptionStarted: false,
}
import { DeviceEventEmitter } from "react-native";
import { Action, action, Thunk, thunk } from "easy-peasy";
import * as base64 from "base64-js";

import { IStoreInjections } from "./store";
import { IStoreModel } from "../state";

import { uploadFileAsString, getFiles, checkResponseIsError } from "../utils/google-drive";
import { Chain } from "../utils/build";

export const GOOGLE_DRIVE_BACKUP_FILE = `blixt-wallet-backup-${Chain}.b64`;

export interface IGoogleDriveBackupModel {
  initialize: Thunk<IGoogleDriveBackupModel>;

  setupChannelUpdateSubscriptions: Thunk<IGoogleDriveBackupModel, void, IStoreInjections, IStoreModel>;
  setChannelUpdateSubscriptionStarted: Action<IGoogleDriveBackupModel, boolean>;

  makeBackup: Thunk<IGoogleDriveBackupModel, void, IStoreInjections, IStoreModel>;

  channelUpdateSubscriptionStarted: boolean;
};

export const googleDriveBackup: IGoogleDriveBackupModel = {
  initialize: thunk(async (actions, _, { getState }) => {
    if (!getState().channelUpdateSubscriptionStarted) {
      await actions.setupChannelUpdateSubscriptions();
    }
  }),

  setupChannelUpdateSubscriptions: thunk((actions, _2, { getStoreState, injections }) => {
    console.log("Starting channel update subscription for Google Drive channel backup");

    DeviceEventEmitter.addListener("SubscribeChannelEvents", async (e: any) => {
      if (!getStoreState().google.isSignedIn) {
        return;
      }
      console.log("GoogleDriveBackup: Received SubscribeChannelEvents");
      const decodeChannelEvent = injections.lndMobile.channel.decodeChannelEvent;
      const channelEvent = decodeChannelEvent(e.data);
      if (channelEvent.openChannel || channelEvent.closedChannel) {
        console.log("New channel event received, starting new Google Drive backup");
        await actions.makeBackup();
      }
    });
    actions.setChannelUpdateSubscriptionStarted(true);
  }),

  makeBackup: thunk(async (_, _2, { getStoreActions, injections }) => {
    const exportAllChannelBackups = injections.lndMobile.channel.exportAllChannelBackups;
    const backup = await exportAllChannelBackups();
    const backupsB64 = base64.fromByteArray(backup.multiChanBackup!.multiChanBackup!);
    const googleTokens = await getStoreActions().google.getTokens();

    const files = await getFiles(googleTokens.accessToken, [GOOGLE_DRIVE_BACKUP_FILE]);
    if (checkResponseIsError(files)) {
      throw new Error(`Error backing up channels to Google Drive. ${JSON.stringify(files)}`);
    }
    else {
      // files.files[0] will be undefined if this is the first
      // time an upload is triggered, so we pass in undefined
      // create a new file.
      const uploadResult = await uploadFileAsString(googleTokens.accessToken, {
        name: GOOGLE_DRIVE_BACKUP_FILE,
        description: "Base64-encoded channel backup for Blixt Wallet",
        mimeType: "application/base64",
      }, backupsB64, files.files[0] ? files.files[0].id : undefined);

      if (checkResponseIsError(uploadResult)) {
        throw new Error(`Error backing up channels to Google Drive. ${JSON.stringify(uploadResult)}`);
      }
      else {
        console.log("Backing up channels to Google Drive succeeded");
        console.log(uploadResult);
        return uploadResult;
      }
    }
  }),

  setChannelUpdateSubscriptionStarted: action((state, payload) => { state.channelUpdateSubscriptionStarted = payload; }),

  channelUpdateSubscriptionStarted: false,
}
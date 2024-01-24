import { Action, action, Thunk, thunk } from "easy-peasy";
import * as base64 from "base64-js";
import { differenceInDays } from "date-fns";
import iCloudStorage from "react-native-icloudstore";

import { IStoreInjections } from "./store";
import { IStoreModel } from "../state";
import { waitUntilTrue, timeout, toast } from "../utils";
import { Chain, Debug, Flavor } from "../utils/build";
import { getItemObject, StorageItem, setItemObject } from "../storage/app";
import { checkLndStreamErrorResponse } from "../utils/lndmobile";
import { LndMobileEventEmitter } from "../utils/event-listener";

import logger from "./../utils/log";
const log = logger("ICloudBackup");

export const ICLOUD_BACKUP_KEY = `blixt-wallet-backup-${Chain}${Debug ? "-debug" : ""}${Flavor ? `-${Flavor}` : ""}`;

export interface IICloudBackupModel {
  initialize: Thunk<IICloudBackupModel, void, IStoreInjections, IStoreModel>;

  setupChannelUpdateSubscriptions: Thunk<IICloudBackupModel, void, IStoreInjections, IStoreModel>;
  makeBackup: Thunk<IICloudBackupModel, void, IStoreInjections, IStoreModel>;
  getBackup: Thunk<IICloudBackupModel, void, IStoreInjections, IStoreModel, Promise<string>>;

  setChannelUpdateSubscriptionStarted: Action<IICloudBackupModel, boolean>;
  setICloudActive: Action<IICloudBackupModel, boolean>;

  channelUpdateSubscriptionStarted: boolean;
  iCloudActive: boolean; // Whether iCloud is active on the system
};

export const iCloudBackup: IICloudBackupModel = {
  initialize: thunk(async (actions, _, { getState, getStoreState, injections }) => {
    log.d("Initializing");
    if (!getState().channelUpdateSubscriptionStarted) {
      await actions.setupChannelUpdateSubscriptions();
    }

    const iCloudActive = await injections.lndMobile.index.checkICloudEnabled();
    log.i("iCloudActive", [iCloudActive]);
    actions.setICloudActive(iCloudActive);

    // Automatically backup every 3 days
    // tslint:disable-next-line: no-floating-promises
    (async () => {
      if (getStoreState().settings.iCloudBackupEnabled) {
        try {
          let lastICloudBackup = await getItemObject<number>(StorageItem.lastICloudBackup);
          log.d("lastICloudBackup", [lastICloudBackup]);
          lastICloudBackup = lastICloudBackup - (60 * 60 * 24 * 1000);
          const currentDate = new Date().getTime();
          const diff = differenceInDays(currentDate, lastICloudBackup);
          if (diff >= 3) {
            log.i(">= 3 days since last iCloud backup");
            await waitUntilTrue(() => getStoreState().lightning.rpcReady);
            await timeout(2500);
            await actions.makeBackup();
            await setItemObject<number>(StorageItem.lastICloudBackup, currentDate);
          }
        } catch (error) {
          log.e("Error while doing auto backup", [error]);
        }
      }
    })();

    log.d("Done");
  }),

  setupChannelUpdateSubscriptions: thunk((actions, _2, { getStoreState, injections }) => {
    log.i("Starting channel update subscription for iCloud channel backup");

    LndMobileEventEmitter.addListener("SubscribeChannelEvents", async (e: any) => {
      try {
        if (!getStoreState().settings.iCloudBackupEnabled) {
          return;
        }
        log.d("Received SubscribeChannelEvents");

        const error = checkLndStreamErrorResponse("SubscribeChannelEvents", e);
        if (error === "EOF") {
          return;
        } else if (error) {
          throw error
        }

        const decodeChannelEvent = injections.lndMobile.channel.decodeChannelEvent;
        const channelEvent = decodeChannelEvent(e.data);
        if (channelEvent.openChannel || channelEvent.closedChannel) {
          log.i("New channel event received, starting new iCloud backup");
          await actions.makeBackup();
        }
      } catch (error) {
        toast("Error backing up to iCloud: " + error.message, undefined, "danger");
      }
    });
    actions.setChannelUpdateSubscriptionStarted(true);
  }),

  makeBackup: thunk(async (_, _2, { injections }) => {
    const exportAllChannelBackups = injections.lndMobile.channel.exportAllChannelBackups;
    const backup = await exportAllChannelBackups();
    const backupsB64 = base64.fromByteArray(backup.multiChanBackup!.multiChanBackup!);
    await iCloudStorage.setItem(ICLOUD_BACKUP_KEY, backupsB64);

    const remoteStoredBackupsB64 = await iCloudStorage.getItem(ICLOUD_BACKUP_KEY);
    if (remoteStoredBackupsB64 !== backupsB64) {
      log.i("iCloud storage mismatch, local, remote:", [backupsB64, remoteStoredBackupsB64])
      throw new Error("Could not save iCloud backup");
    }

    log.i("Backing up channels to iCloud succeeded");
  }),

  getBackup: thunk(async () => {
    return await iCloudStorage.getItem(ICLOUD_BACKUP_KEY);
  }),

  setChannelUpdateSubscriptionStarted: action((state, payload) => { state.channelUpdateSubscriptionStarted = payload; }),
  setICloudActive: action((state, payload) => { state.iCloudActive = payload; }),

  channelUpdateSubscriptionStarted: false,
  iCloudActive: false,
}

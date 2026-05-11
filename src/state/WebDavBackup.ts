import { Action, action, Thunk, thunk } from "easy-peasy";
import * as base64 from "base64-js";
import { differenceInDays } from "date-fns";

import { IStoreModel } from "../state";
import { waitUntilTrue, timeout, toast } from "../utils";
import { Chain, Debug, Flavor } from "../utils/build";
import { getItemObject, StorageItem, setItemObject } from "../storage/app";
import { getWebDavBackupPassword } from "../storage/keystore";
import { downloadWebDavFile, getWebDavBackupUrl, uploadWebDavFile } from "../utils/webdav";

import { exportAllChannelBackups, subscribeChannelEvents } from "react-native-turbo-lnd";
import { MultiChanBackup } from "react-native-turbo-lnd/protos/lightning_pb";

import logger from "./../utils/log";
const log = logger("WebDavBackup");

export const WEBDAV_BACKUP_FILE = `blixt-wallet-backup-${Chain}${Debug ? "-debug" : ""}${Flavor ? `-${Flavor}` : ""}.b64`;

export interface IWebDavBackupModel {
  initialize: Thunk<IWebDavBackupModel, void, any, IStoreModel>;

  setupChannelUpdateSubscriptions: Thunk<IWebDavBackupModel, void, any, IStoreModel>;
  setChannelUpdateSubscriptionStarted: Action<IWebDavBackupModel, boolean>;

  makeBackup: Thunk<IWebDavBackupModel, void, any, IStoreModel>;
  getBackup: Thunk<IWebDavBackupModel, void, any, IStoreModel, Promise<string>>;

  channelUpdateSubscriptionStarted: boolean;
}

export const webDavBackup: IWebDavBackupModel = {
  initialize: thunk(async (actions, _, { getState, getStoreState }) => {
    log.d("Initializing");
    if (!getState().channelUpdateSubscriptionStarted) {
      await actions.setupChannelUpdateSubscriptions();
    }

    // Automatically backup every 3 days
    // tslint:disable-next-line: no-floating-promises
    (async () => {
      if (getStoreState().settings.webDavBackupEnabled) {
        try {
          let lastWebDavBackup = await getItemObject<number>(StorageItem.lastWebDavBackup);
          log.d("lastWebDavBackup", [lastWebDavBackup]);
          lastWebDavBackup = lastWebDavBackup - 60 * 60 * 24 * 1000;
          const currentDate = new Date().getTime();
          const diff = differenceInDays(currentDate, lastWebDavBackup);
          if (diff >= 3) {
            log.i(">= 3 days since last WebDAV backup");
            await waitUntilTrue(() => getStoreState().lightning.rpcReady);
            await timeout(2500);
            await actions.makeBackup();
            await setItemObject<number>(StorageItem.lastWebDavBackup, currentDate);
          }
        } catch (error) {
          log.e("Error while doing WebDAV auto backup", [error]);
        }
      }
    })();
    log.d("Done");
  }),

  setupChannelUpdateSubscriptions: thunk((actions, _2, { getStoreState }) => {
    log.i("Starting channel update subscription for WebDAV channel backup");

    subscribeChannelEvents(
      {},
      async (channelEvent) => {
        try {
          if (!getStoreState().settings.webDavBackupEnabled) {
            return;
          }

          log.d("WebDavBackup: Received SubscribeChannelEvents");

          if (
            channelEvent.channel.case === "openChannel" ||
            channelEvent.channel.case === "closedChannel"
          ) {
            log.i("New channel event received, starting new WebDAV backup");
            await actions.makeBackup();
          }
        } catch (error: any) {
          toast("Error backing up to WebDAV: " + error.message, undefined, "danger", "OK");
        }
      },
      (error) => {
        toast("subscribeChannelEvents: " + error, undefined, "danger");
      },
    );

    actions.setChannelUpdateSubscriptionStarted(true);
  }),

  makeBackup: thunk(async (_, _2, { getStoreState }) => {
    const backupUrl = getWebDavBackupUrl(
      getStoreState().settings.webDavBackupUrl,
      WEBDAV_BACKUP_FILE,
    );
    const backup = await exportAllChannelBackups({});
    const backupsB64 = base64.fromByteArray(
      (backup.multiChanBackup as MultiChanBackup).multiChanBackup,
    ); // TURBOLND uh weird

    await uploadWebDavFile(backupUrl, backupsB64, {
      username: getStoreState().settings.webDavBackupUsername,
      password: (await getWebDavBackupPassword()) ?? "",
    });

    log.i("Backing up channels to WebDAV succeeded");
  }),

  getBackup: thunk(async (_, _2, { getStoreState }) => {
    const backupUrl = getWebDavBackupUrl(
      getStoreState().settings.webDavBackupUrl,
      WEBDAV_BACKUP_FILE,
    );

    const backupB64 = await downloadWebDavFile(backupUrl, {
      username: getStoreState().settings.webDavBackupUsername,
      password: (await getWebDavBackupPassword()) ?? "",
    });
    log.i("Download succeeded");
    return backupB64;
  }),

  setChannelUpdateSubscriptionStarted: action((state, payload) => {
    state.channelUpdateSubscriptionStarted = payload;
  }),

  channelUpdateSubscriptionStarted: false,
};

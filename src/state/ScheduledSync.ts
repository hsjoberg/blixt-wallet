import { Alert, Clipboard, AppState, AppStateStatus, NativeModules } from "react-native"
import { Action, action, Thunk, thunk, computed, Computed } from "easy-peasy";
import { IStoreModel } from "./index";
import { StorageItem, getItemObject } from "../storage/app";
import { WorkInfo } from "../lndmobile/scheduled-sync";
import { IStoreInjections } from "./store.ts";

import logger from "./../utils/log";
const log = logger("ScheduledSync");

const { LndMobileScheduledSync } = NativeModules;

export interface IScheduledSyncModel {
  initialize: Thunk<IScheduledSyncModel>;

  retrieveSyncInfo: Thunk<IScheduledSyncModel, void, any, IStoreInjections>;
  setSyncEnabled: Thunk<IScheduledSyncModel, boolean>;

  setLastScheduledSync: Action<IScheduledSyncModel, number>;
  setLastScheduledSyncAttempt: Action<IScheduledSyncModel, number>;
  setWorkInfo: Action<IScheduledSyncModel, WorkInfo>;

  syncEnabled: Computed<IScheduledSyncModel, boolean>;
  lastScheduledSync: number;
  lastScheduledSyncAttempt: number;
  workInfo: WorkInfo | null;
}

export const scheduledSync: IScheduledSyncModel = {
  initialize: thunk(async (actions) => {
    await actions.retrieveSyncInfo();
  }),

  retrieveSyncInfo: thunk(async (actions, _, { injections }) => {
    try {
      actions.setLastScheduledSync(await getItemObject<number>(StorageItem.lastScheduledSync));
      actions.setLastScheduledSyncAttempt(await getItemObject<number>(StorageItem.lastScheduledSyncAttempt));
      actions.setWorkInfo(await injections.lndMobile.scheduledSync.checkScheduledSyncWorkStatus());
    } catch (e) {
      log.e("Error retrieving sync info", [e]);
    }
  }),

  setSyncEnabled: thunk(async (actions, enabled) => {
    enabled
      ? await LndMobileScheduledSync.setupScheduledSyncWork()
      : await LndMobileScheduledSync.removeScheduledSyncWork();
    actions.setWorkInfo(await LndMobileScheduledSync.checkScheduledSyncWorkStatus());
  }),

  setLastScheduledSync: action((state, payload) => { state.lastScheduledSync = payload; }),
  setLastScheduledSyncAttempt: action((state, payload) => { state.lastScheduledSyncAttempt = payload; }),
  setWorkInfo: action((state, payload) => { state.workInfo = payload; }),

  syncEnabled: computed((store) => ["BLOCKED", "ENQUEUED", "FAILED", "RUNNING", "SUCCEEDED"].includes(store.workInfo!)),
  lastScheduledSync: 0,
  lastScheduledSyncAttempt: 0,
  workInfo: null,
};

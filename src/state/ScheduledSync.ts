import { Action, action, Thunk, thunk, computed, Computed } from "easy-peasy";
import { StorageItem, getItemObject } from "../storage/app";
import { WorkInfo } from "../turbomodules/NativeScheduledSyncTurbo";
import {
  checkScheduledSyncWorkStatus,
  removeScheduledSyncWork,
  setupScheduledSyncWork,
} from "../lndmobile/scheduled-sync";
import { PLATFORM } from "../utils/constants";

import logger from "./../utils/log";
const log = logger("ScheduledSync");

export interface IScheduledSyncModel {
  initialize: Thunk<IScheduledSyncModel>;

  retrieveSyncInfo: Thunk<IScheduledSyncModel, void, any, any>;
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
    if (PLATFORM !== "android") {
      log.i("initialize(): Platform does not support scheduled sync yet");
      return;
    }
    await actions.retrieveSyncInfo();
  }),

  retrieveSyncInfo: thunk(async (actions) => {
    if (PLATFORM !== "android") {
      log.w("retrieveSyncInfo(): Platform does not support scheduled sync yet");
      return;
    }

    try {
      actions.setLastScheduledSync(await getItemObject<number>(StorageItem.lastScheduledSync));
      actions.setLastScheduledSyncAttempt(
        await getItemObject<number>(StorageItem.lastScheduledSyncAttempt),
      );
      actions.setWorkInfo(await checkScheduledSyncWorkStatus());
    } catch (e) {
      log.e("Error retrieving sync info", [e]);
    }
  }),

  setSyncEnabled: thunk(async (actions, enabled) => {
    if (PLATFORM !== "android") {
      log.w("setSyncEnabled(): Platform does not support scheduled sync yet");
      return;
    }

    enabled ? await setupScheduledSyncWork() : await removeScheduledSyncWork();
    actions.setWorkInfo(await checkScheduledSyncWorkStatus());
  }),

  setLastScheduledSync: action((state, payload) => {
    state.lastScheduledSync = payload;
  }),
  setLastScheduledSyncAttempt: action((state, payload) => {
    state.lastScheduledSyncAttempt = payload;
  }),
  setWorkInfo: action((state, payload) => {
    state.workInfo = payload;
  }),

  syncEnabled: computed((store) =>
    ["BLOCKED", "ENQUEUED", "FAILED", "RUNNING", "SUCCEEDED"].includes(store.workInfo!),
  ),
  lastScheduledSync: 0,
  lastScheduledSyncAttempt: 0,
  workInfo: "WORK_NOT_EXIST",
};

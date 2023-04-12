import { NativeModules } from "react-native"
import { Action, action, Thunk, thunk, computed, Computed } from "easy-peasy";
import { StorageItem, getItemObject } from "../storage/app";
import { WorkInfo } from "../lndmobile/LndMobile";
import { IStoreInjections } from "./store";
import { PLATFORM } from "../utils/constants";

import logger from "./../utils/log";
const log = logger("ScheduledSync");

const { GossipFileScheduledSync } = NativeModules;

export interface IScheduledGossipSyncModel {
  initialize: Thunk<IScheduledGossipSyncModel>;

  retrieveSyncInfo: Thunk<IScheduledGossipSyncModel, void, any, IStoreInjections>;
  setSyncEnabled: Thunk<IScheduledGossipSyncModel, boolean>;

  setLastScheduledSync: Action<IScheduledGossipSyncModel, number>;
  setLastScheduledSyncAttempt: Action<IScheduledGossipSyncModel, number>;
  setWorkInfo: Action<IScheduledGossipSyncModel, WorkInfo>;

  syncEnabled: Computed<IScheduledGossipSyncModel, boolean>;
  lastScheduledSync: number;
  lastScheduledSyncAttempt: number;
  workInfo: WorkInfo | null;
}

export const scheduledGossipSync: IScheduledGossipSyncModel = {
  initialize: thunk(async (actions) => {
    if (PLATFORM !== "android") {
      log.i("initialize(): Platform does not support scheduled gossip sync yet");
      return;
    }
    await actions.retrieveSyncInfo();
  }),

  retrieveSyncInfo: thunk(async (actions, _, { injections }) => {
    if (PLATFORM !== "android") {
      log.w("retrieveSyncInfo(): Platform does not support scheduled gossip sync yet");
      return;
    }

    try {
      actions.setLastScheduledSync(await getItemObject<number>(StorageItem.lastScheduledGossipSync));
      actions.setLastScheduledSyncAttempt(await getItemObject<number>(StorageItem.lastScheduledGossipSyncAttempt));
      actions.setWorkInfo(await injections.lndMobile.scheduledGossipSync.checkScheduledGossipSyncWorkStatus());
    } catch (e) {
      log.e("Error retrieving gossip file sync info", [e]);
    }
  }),

  setSyncEnabled: thunk(async (actions, enabled) => {
    if (PLATFORM !== "android") {
      log.w("setSyncEnabled(): Platform does not support scheduled sync yet");
      return;
    }

    enabled
      ? await GossipFileScheduledSync.setupScheduledSyncWork()
      : await GossipFileScheduledSync.removeScheduledSyncWork();
    actions.setWorkInfo(await GossipFileScheduledSync.checkScheduledSyncWorkStatus());
  }),

  setLastScheduledSync: action((state, payload) => { state.lastScheduledSync = payload; }),
  setLastScheduledSyncAttempt: action((state, payload) => { state.lastScheduledSyncAttempt = payload; }),
  setWorkInfo: action((state, payload) => { state.workInfo = payload; }),

  syncEnabled: computed((store) => ["BLOCKED", "ENQUEUED", "FAILED", "RUNNING", "SUCCEEDED"].includes(store.workInfo!)),
  lastScheduledSync: 0,
  lastScheduledSyncAttempt: 0,
  workInfo: "WORK_NOT_EXIST",
};

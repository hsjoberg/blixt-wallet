import { NativeModules, ToastAndroid } from "react-native";
import { Action, action, Thunk, thunk } from "easy-peasy";
import { differenceInDays } from "date-fns";

import { IStoreModel } from "./index";
import { IStoreInjections } from "./store";
import { lnrpc } from "../../proto/proto";
import { getItemObject, StorageItem, setItemObject } from "../storage/app";

const { LndMobile } = NativeModules;

const timeout = (time: number) => new Promise((resolve) => setTimeout(() => resolve(), time));

export interface ILightningModel {
  initialize: Thunk<ILightningModel, undefined, IStoreInjections, IStoreModel>;

  unlockWallet: Thunk<ILightningModel, undefined, IStoreInjections>;
  getInfo: Thunk<ILightningModel, undefined, IStoreInjections>;
  waitForChainSync: Thunk<ILightningModel, undefined, IStoreInjections>;

  setNodeInfo: Action<ILightningModel, lnrpc.IGetInfoResponse>;
  setReady: Action<ILightningModel, boolean>;
  setFirstSync: Action<ILightningModel, boolean>;

  nodeInfo?: lnrpc.IGetInfoResponse;
  ready: boolean;
  firstSync: boolean;
}

export const lightning: ILightningModel = {
  initialize: thunk(async (actions, _, { getState, dispatch, injections }) => {
    const { ready } = getState();
    if (ready)  {
      console.log("Lightning store already started");
      return true;
    }

    const lastSync: number = await getItemObject(StorageItem.timeSinceLastSync);
    const firstSync: boolean = await getItemObject(StorageItem.firstSync);
    actions.setFirstSync(firstSync);

    const { checkStatus } = injections.lndMobile.index;
    const start = new Date().getTime();

    const status = await checkStatus();
    if ((status & LndMobile.STATUS_WALLET_UNLOCKED) !== LndMobile.STATUS_WALLET_UNLOCKED) {
      await actions.unlockWallet(undefined);
    }
    console.log("lnd: time to start and unlock: " + (new Date().getTime() - start) + "ms");
    Promise.all([
      dispatch.transaction.getTransactions(undefined),
      dispatch.channel.initialize(undefined),
      dispatch.receive.initialize(undefined),
    ]);

    if (differenceInDays(new Date(), lastSync) <3) {
      actions.setReady(true);
      actions.waitForChainSync(); // Run asynchronously
    }
    else {
      await actions.waitForChainSync(); // Run synchronously
    }

    console.log("lnd startup time: " + (new Date().getTime() - start) + "ms");
    ToastAndroid.show("lnd startup time: " + (new Date().getTime() - start) + "ms", ToastAndroid.SHORT);
    return true;
  }),

  unlockWallet: thunk(async (_, _2, { injections }) => {
    const { unlockWallet } = injections.lndMobile.wallet;

    try {
      console.log("try unlockWallet");
      await unlockWallet("test1234");
    }
    catch (e) {
      console.log(e);
      ToastAndroid.show(e, ToastAndroid.LONG);
    }
  }),

  getInfo: thunk(async (actions, _, { getState, injections }) => {
    const { getInfo } = injections.lndMobile.index;
    const info = await getInfo();
    actions.setNodeInfo(info);
  }),

  waitForChainSync: thunk(async (actions, _, { getState, injections }) => {
    const { getInfo } = injections.lndMobile.index;
    const firstSync = getState().firstSync;
    let info;
    do {
      info = await getInfo();
      console.log("blockHeight", info.blockHeight);
      console.log("syncedToChain", info.syncedToChain);
      actions.setNodeInfo(info);

      if (info.syncedToChain !== true) {
        await timeout(firstSync ? 6000 : 50000);
      }
      else {
        console.log(info);
      }
    } while (!info.syncedToChain);

    if (firstSync) {
      await setItemObject(StorageItem.firstSync, false);
      actions.setFirstSync(false);
    }
    actions.setReady(true);
    await setItemObject(StorageItem.timeSinceLastSync, new Date().getTime());
  }),

  setNodeInfo: action((state, payload) => { state.nodeInfo = payload; }),
  setReady: action((state, payload) => { state.ready = payload; }),
  setFirstSync: action((state, payload) => { state.firstSync = payload; }),

  ready: false,
  firstSync: false,
};

import { NativeModules, ToastAndroid } from "react-native";
import { Action, action, Thunk, thunk } from "easy-peasy";

import { IStoreModel } from "./index";
import { IStoreInjections } from "./store";
import { lnrpc } from "../../proto/proto";

const { LndMobile } = NativeModules;

const timeout = (time: number) => new Promise((resolve) => setTimeout(() => resolve(), time));

export interface ILightningModel {
  initialize: Thunk<ILightningModel, undefined, IStoreInjections, IStoreModel>;

  unlockWallet: Thunk<ILightningModel, undefined, IStoreInjections>;
  getInfo: Thunk<ILightningModel, undefined, IStoreInjections>;

  setNodeInfo: Action<ILightningModel, lnrpc.IGetInfoResponse>;
  setReady: Action<ILightningModel, boolean>;
  setFirstSync: Action<ILightningModel, boolean>;

  nodeInfo?: lnrpc.IGetInfoResponse;
  syncedToChain: boolean;
  ready: boolean;
  firstSync: boolean;
}

export const lightning: ILightningModel = {
  initialize: thunk(async (actions, _, { dispatch, injections }) => {
    const { checkStatus } = injections.lndMobile.index;
    const start = new Date().getTime();

    const status = await checkStatus();
    if ((status & LndMobile.STATUS_WALLET_UNLOCKED) !== LndMobile.STATUS_WALLET_UNLOCKED) {
      await actions.unlockWallet(undefined);
    }
    console.log("lnd: time to start and unlock: " + (new Date().getTime() - start) + "ms");
    await Promise.all([
      actions.getInfo(undefined),
      dispatch.transaction.getTransactions(undefined),
      dispatch.channel.initialize(undefined),
      dispatch.receive.initialize(undefined),
    ]);
    actions.setReady(true);

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
    const firstSync = getState().firstSync;
    let info;
    do {
      console.log("getInfo");
      info = await getInfo();
      console.log("blockHeight", info.blockHeight);
      console.log("syncedToChain", info.syncedToChain);
      actions.setNodeInfo(info);

      if (info.syncedToChain !== true) {
        await timeout(firstSync ? 6000 : 600);
      }
      else {
        console.log(info);
      }
    } while (!info.syncedToChain);
  }),

  setNodeInfo: action((state, payload) => { state.nodeInfo = payload; }),
  setReady: action((state, payload) => { state.ready = payload; }),
  setFirstSync: action((state, payload) => { state.firstSync = payload; }),

  syncedToChain: false,
  ready: false,
  firstSync: false,
};

import { NativeModules, ToastAndroid } from "react-native";
import { Action, action, Thunk, thunk } from "easy-peasy";
import { getInfo } from "../lndmobile/index";
import { unlockWallet } from "../lndmobile/wallet";
import { channelBalance } from "../lndmobile/channel";
import { IStoreModel } from "./index";
import { lnrpc } from "../../proto/proto";

const { LndMobile } = NativeModules;

const timeout = (time: number) => new Promise((resolve) => setTimeout(() => resolve(), time));

export interface ILightningModel {
  initialize: Thunk<ILightningModel, undefined, any, IStoreModel>;

  unlockWallet: Thunk<ILightningModel>;
  getInfo: Thunk<ILightningModel, undefined>;

  setNodeInfo: Action<ILightningModel, lnrpc.IGetInfoResponse>;
  setReady: Action<ILightningModel, boolean>;
  setFirstSync: Action<ILightningModel, boolean>;

  nodeInfo?: lnrpc.IGetInfoResponse;
  syncedToChain: boolean;
  ready: boolean;
  firstSync: boolean;
}

export const lightning: ILightningModel = {
  initialize: thunk(async (actions, _, { dispatch }) => {
    const start = new Date().getTime();

    const status = await LndMobile.checkStatus();
    if ((status & LndMobile.STATUS_WALLET_UNLOCKED) !== LndMobile.STATUS_WALLET_UNLOCKED) {
      await actions.unlockWallet(undefined);
    }
    console.log("lnd: time to start and unlock: " + (new Date().getTime() - start) + "ms");
    await actions.getInfo(undefined);
    await dispatch.transaction.getTransactions(undefined);
    await dispatch.channel.initialize(undefined);
    await dispatch.receive.initialize(undefined);
    actions.setReady(true);

    console.log("lnd startup time: " + (new Date().getTime() - start) + "ms");
    ToastAndroid.show("lnd startup time: " + (new Date().getTime() - start) + "ms", ToastAndroid.SHORT);

    return true;
  }),

  unlockWallet: thunk(async () => {
    try {
      console.log("try unlockWallet");
      await unlockWallet("test1234");
    }
    catch (e) {
      console.log(e);
      console.log(typeof e);
      ToastAndroid.show(e, ToastAndroid.LONG);
    }
  }),

  getInfo: thunk(async (actions, _, { getState }) => {
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

  setNodeInfo: action((state, payload) => {
    state.nodeInfo = payload;
  }),

  setReady: action((state, payload) => {
    state.ready = payload;
  }),

  setFirstSync: action((state, payload) => {
    state.firstSync = payload;
  }),

  syncedToChain: false,
  ready: false,
  firstSync: false,
};

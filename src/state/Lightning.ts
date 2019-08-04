import { Platform, ToastAndroid } from "react-native";
import { Action, action, Thunk, thunk } from "easy-peasy";
import { differenceInDays } from "date-fns";

import { IStoreModel } from "./index";
import { IStoreInjections } from "./store";
import { ELndMobileStatusCodes } from "../lndmobile/index";
import { lnrpc } from "../../proto/proto";
import { getItemObject, StorageItem, setItemObject, getItem } from "../storage/app";
import { Chain } from "../utils/build";

const timeout = (time: number) => new Promise((resolve) => setTimeout(() => resolve(), time));

export interface ILightningModel {
  initialize: Thunk<ILightningModel, undefined, IStoreInjections, IStoreModel>;

  unlockWallet: Thunk<ILightningModel, undefined, IStoreInjections>;
  getInfo: Thunk<ILightningModel, undefined, IStoreInjections>;
  waitForChainSync: Thunk<ILightningModel, undefined, IStoreInjections>;
  setupAutopilot: Thunk<ILightningModel, boolean, IStoreInjections>;

  setNodeInfo: Action<ILightningModel, lnrpc.IGetInfoResponse>;
  setReady: Action<ILightningModel, boolean>;
  setFirstSync: Action<ILightningModel, boolean>;

  nodeInfo?: lnrpc.IGetInfoResponse;
  ready: boolean;
  firstSync: boolean;
}

export const lightning: ILightningModel = {
  initialize: thunk(async (actions, _, { getState, dispatch, injections, getStoreState }) => {
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
    if ((status & ELndMobileStatusCodes.STATUS_WALLET_UNLOCKED) !== ELndMobileStatusCodes.STATUS_WALLET_UNLOCKED) {
      try {
        await actions.unlockWallet(undefined);
      } catch (e) {
        console.log(e.message);
        ToastAndroid.show("Error: Cannot unlock wallet", ToastAndroid.LONG);
        return
      }
    }
    console.log("lnd: time to start and unlock: " + (new Date().getTime() - start) + "ms");
    await dispatch.transaction.getTransactions(undefined),
    Promise.all([
      dispatch.channel.initialize(undefined),
      dispatch.receive.initialize(undefined),
      dispatch.onChain.initialize(undefined),
      dispatch.transaction.checkOpenTransactions(undefined),
    ]);

    if (differenceInDays(new Date(), lastSync) <3) {
      actions.setReady(true);
      // Run asynchronously
      actions.waitForChainSync().then(async () => {
        await actions.setupAutopilot(getStoreState().settings.autopilotEnabled);
      });
    }
    else {
      // Run synchronously
      await actions.waitForChainSync();
      await actions.setupAutopilot(getStoreState().settings.autopilotEnabled);
    }

    console.log("lnd startup time: " + (new Date().getTime() - start) + "ms");
    if (Platform.OS === "android") {
      ToastAndroid.show("lnd startup time: " + (new Date().getTime() - start) + "ms", ToastAndroid.SHORT);
    }

    return true;
  }),

  unlockWallet: thunk(async (_, _2, { injections }) => {
    const { unlockWallet } = injections.lndMobile.wallet;
    console.log("try unlockWallet");
    const password = await getItem(StorageItem.walletPassword);
    if (!password) {
      throw new Error("Cannot find wallet password");
    }
    await unlockWallet(password);
  }),

  setupAutopilot: thunk(async (_, enabled, { injections }) => {
    const modifyStatus = injections.lndMobile.autopilot.modifyStatus;
    const status = injections.lndMobile.autopilot.status;

    if (enabled) {
      await timeout(2000);
      const scores = await getNodeScores();
      console.log(scores);
      const setScore = injections.lndMobile.autopilot.setScores;
      await setScore(scores);
    }

    do {
      try {
        await modifyStatus(enabled);
        console.log("Autopilot status:");
        console.log(await status());
        break;
      } catch (e) {
        console.log(e.message);
        await timeout(2000);
      }
    } while (true);
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
        await timeout(firstSync ? 6000 : 1000);
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

const getNodeScores = async () => {
  const url = Chain === "mainnet"
    ? "https://nodes.lightning.computer/availability/v1/btc.json"
    : "https://nodes.lightning.computer/availability/v1/btctestnet.json";
  const response = await fetch(url);
  const json = await response.json();

  const scores = json.scores.reduce((map, { public_key, score }) => {
    if (typeof public_key !== 'string' || !Number.isInteger(score)) {
      throw new Error('Invalid node score format!');
    }
    map[public_key] = score / 100000000.0;
    return map;
  }, {});
  return scores;
}

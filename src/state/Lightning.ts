import { DeviceEventEmitter } from "react-native";
import { Action, action, Thunk, thunk } from "easy-peasy";
import { differenceInDays } from "date-fns";

import { IStoreModel } from "./index";
import { IStoreInjections } from "./store";
import { ELndMobileStatusCodes } from "../lndmobile/index";
import { lnrpc } from "../../proto/proto";
import { getItemObject, StorageItem, setItemObject, getItem } from "../storage/app";
import { toast, timeout } from "../utils";
import { Chain } from "../utils/build";

const SYNC_UNLOCK_WALLET = false;

export interface ILightningModel {
  initialize: Thunk<ILightningModel, void, IStoreInjections, IStoreModel>;

  setupStores: Thunk<ILightningModel, void, IStoreInjections, IStoreModel>;

  unlockWallet: Thunk<ILightningModel, void, IStoreInjections>;
  getInfo: Thunk<ILightningModel, void, IStoreInjections>;
  waitForChainSync: Thunk<ILightningModel, void, IStoreInjections>;
  waitForGraphSync: Thunk<ILightningModel, void, IStoreInjections>;
  setupAutopilot: Thunk<ILightningModel, boolean, IStoreInjections>;

  setNodeInfo: Action<ILightningModel, lnrpc.IGetInfoResponse>;
  setRPCServerReady: Action<ILightningModel, boolean>;
  setReady: Action<ILightningModel, boolean>;
  setSyncedToChain: Action<ILightningModel, boolean>;
  setSyncedToGraph: Action<ILightningModel, boolean>;
  setFirstSync: Action<ILightningModel, boolean>;

  nodeInfo?: lnrpc.IGetInfoResponse;
  rpcReady: boolean;
  syncedToChain: boolean;
  syncedToGraph: boolean;
  ready: boolean;
  firstSync: boolean;
}

export const lightning: ILightningModel = {
  initialize: thunk(async (actions, _, { getState, dispatch, injections, getStoreState }) => {
    const checkStatus = injections.lndMobile.index.checkStatus;

    if (getState().ready)  {
      console.log("Lightning store already started");
    }

    const start = new Date();
    const lastSync = await getItemObject<number>(StorageItem.timeSinceLastSync);
    const firstSync = await getItemObject<boolean>(StorageItem.firstSync);
    actions.setFirstSync(firstSync);
    const debugShowStartupInfo = getStoreState().settings.debugShowStartupInfo;
    const fastInit = differenceInDays(start, lastSync) <3 || firstSync;

    const status = await checkStatus();
    // Normal wallet unlock flow
    if ((status & ELndMobileStatusCodes.STATUS_WALLET_UNLOCKED) !== ELndMobileStatusCodes.STATUS_WALLET_UNLOCKED) {
      // When the RPC server is ready
      // WalletUnlocked event will be emitted
      DeviceEventEmitter.addListener("WalletUnlocked", async () => {
        debugShowStartupInfo && toast("RPC server ready time: " + (new Date().getTime() - start.getTime()) / 1000 + "s", 1000);
        actions.setRPCServerReady(true);
        try {
          actions.setupStores();
          await actions.waitForChainSync();
          await actions.setupAutopilot(getStoreState().settings.autopilotEnabled);
          await actions.waitForGraphSync();
        } catch (e) {
          debugShowStartupInfo && toast(e.message, 10000, "danger");
          return;
        }

        debugShowStartupInfo && toast("syncedToChain time: " + (new Date().getTime() - start.getTime()) / 1000 + "s");
      });

      try {
        SYNC_UNLOCK_WALLET
          ? await actions.unlockWallet()
          : actions.unlockWallet().then(
            () => debugShowStartupInfo && toast("UnlockWallet time: " + (new Date().getTime() - start.getTime()) / 1000 + "s", 1000)
          );
      } catch (e) {
        console.log(e.message);
        debugShowStartupInfo && toast("Error: Cannot unlock wallet", 10000, "danger");
        return
      }
    }
    // If a wallet was created, STATUS_WALLET_UNLOCKED would
    // already be set when this function is called.
    // This code path will also be used if we hot-reload the app (debug builds)
    else {
      actions.setupStores();
      if (fastInit) {
        actions.waitForChainSync().then(
          async () => {
            await actions.setupAutopilot(getStoreState().settings.autopilotEnabled);
            await actions.waitForGraphSync();
          }
        );
      }
      else {
        await actions.waitForChainSync();
        await actions.setupAutopilot(getStoreState().settings.autopilotEnabled);
        actions.waitForGraphSync();
      }

      actions.setRPCServerReady(true);
    }

    await dispatch.transaction.getTransactions();
    await dispatch.channel.setupCachedBalance();

    if (fastInit) {
      actions.setReady(true);
    }

    debugShowStartupInfo && toast("Initialize time: " + (new Date().getTime() - start.getTime()) / 1000 + "s", 1000);
    return true;
  }),

  setupStores: thunk(async (_, _2, { dispatch }) => {
    try {
      await Promise.all([
        dispatch.channel.initialize(),
        dispatch.receive.initialize(),
        dispatch.onChain.initialize(),
        dispatch.transaction.checkOpenTransactions(),
        dispatch.scheduledSync.initialize(),
      ]);
      await dispatch.clipboardManager.initialize();
    } catch (e) {
      toast(e.message, 10000, "danger");
      return;
    }
  }),

  unlockWallet: thunk(async (_, _2, { injections }) => {
    const unlockWallet = injections.lndMobile.wallet.unlockWallet;
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
      await timeout(1000); // TODO(hsjoberg): why?
      const scores = await getNodeScores();
      //console.log(scores);
      const setScore = injections.lndMobile.autopilot.setScores;
      await setScore(scores);
    }

    do {
      try {
        await modifyStatus(enabled);
        console.log("Autopilot status:", await status());
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
      console.log(`blockHeight: ${info.blockHeight}, syncedToChain: ${info.syncedToChain}`);
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
    actions.setSyncedToChain(info.syncedToChain);
    await setItemObject(StorageItem.timeSinceLastSync, new Date().getTime());
  }),

  waitForGraphSync: thunk(async (actions, _, { getState, injections }) => {
    const { getInfo } = injections.lndMobile.index;
    let info;
    do {
      info = await getInfo();
      console.log(`blockHeight: ${info.blockHeight}, syncedToGraph: ${info.syncedToGraph}`);
      actions.setNodeInfo(info);

      if (info.syncedToGraph !== true) {
        await timeout(1100);
      }
    } while (!info.syncedToGraph);
    actions.setSyncedToGraph(info.syncedToGraph);
  }),

  setNodeInfo: action((state, payload) => { state.nodeInfo = payload; }),
  setRPCServerReady: action((state, payload) => { state.rpcReady = payload; }),
  setReady: action((state, payload) => { state.ready = payload; }),
  setSyncedToChain: action((state, payload) => { state.syncedToChain = payload; }),
  setSyncedToGraph: action((state, payload) => { state.syncedToGraph = payload; }),
  setFirstSync: action((state, payload) => { state.firstSync = payload; }),

  rpcReady: false,
  ready: false,
  syncedToChain: false,
  syncedToGraph: false,
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

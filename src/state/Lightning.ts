import { Action, action, Thunk, thunk, Computed, computed } from "easy-peasy";
import { differenceInDays } from "date-fns";

import { IStoreModel } from "./index";
import { IStoreInjections } from "./store";
import { ELndMobileStatusCodes } from "../lndmobile/index";
import { lnrpc } from "../../proto/proto";
import { getItemObject, StorageItem, setItemObject, getItem } from "../storage/app";
import { toast, timeout, stringToUint8Array } from "../utils";
import { Chain } from "../utils/build";
import { getWalletPassword } from "../storage/keystore";
import { LndMobileEventEmitter } from "../utils/event-listener";

import logger from "./../utils/log";
const log = logger("Lightning");

const SYNC_UNLOCK_WALLET = false;

export type LndChainBackend = "neutrino" | "bitcoindWithZmq";

interface ILightningPeer {
  peer: lnrpc.Peer;
  node?: lnrpc.LightningNode;
}

interface ISetLightningPeersPayload {
  peer: lnrpc.IPeer;
  node?: lnrpc.ILightningNode;
}

export interface ILightningModel {
  initialize: Thunk<ILightningModel, void, IStoreInjections, IStoreModel>;

  setupStores: Thunk<ILightningModel, void, IStoreInjections, IStoreModel>;

  unlockWallet: Thunk<ILightningModel, void, IStoreInjections>;
  getInfo: Thunk<ILightningModel, void, IStoreInjections>;
  waitForChainSync: Thunk<ILightningModel, void, IStoreInjections>;
  waitForGraphSync: Thunk<ILightningModel, void, IStoreInjections>;
  setupAutopilot: Thunk<ILightningModel, boolean, IStoreInjections>;
  getLightningPeers: Thunk<ILightningModel, void, IStoreInjections>;
  connectPeer: Thunk<ILightningModel, string, IStoreInjections>;
  disconnectPeer: Thunk<ILightningModel, string, IStoreInjections>;
  signMessage: Thunk<ILightningModel, string, IStoreInjections, {}, Promise<lnrpc.SignMessageResponse>>;

  setNodeInfo: Action<ILightningModel, lnrpc.IGetInfoResponse>;
  setRPCServerReady: Action<ILightningModel, boolean>;
  setReady: Action<ILightningModel, boolean>;
  setSyncedToChain: Action<ILightningModel, boolean>;
  setSyncedToGraph: Action<ILightningModel, boolean>;
  setFirstSync: Action<ILightningModel, boolean>;
  setAutopilotSet: Action<ILightningModel, boolean>;
  setLightningPeers: Action<ILightningModel, ISetLightningPeersPayload[]>

  setBestBlockheight: Action<ILightningModel, number>;

  nodeInfo?: lnrpc.IGetInfoResponse;
  rpcReady: boolean;
  syncedToChain: Computed<ILightningModel, boolean>;
  syncedToGraph: Computed<ILightningModel, boolean>;
  ready: boolean;
  firstSync: boolean;
  autopilotSet?: boolean;
  lightningPeers: ILightningPeer[];

  bestBlockheight?: number;
  initialKnownBlockheight?: number;
}

export const lightning: ILightningModel = {
  initialize: thunk(async (actions, _, { getState, dispatch, injections, getStoreState }) => {
    log.d("getState().ready" + getState().ready);
    if (getState().ready)  {
      log.d("Lightning store already started");
      return;
    }

    // When the RPC server is ready
    // WalletUnlocked event will be emitted
    log.v("Starting WalletUnlocked event listener");

    LndMobileEventEmitter.addListener("WalletUnlocked", async () => {
      debugShowStartupInfo && toast("RPC server ready time: " + (new Date().getTime() - start.getTime()) / 1000 + "s", 1000);
      actions.setRPCServerReady(true);
      try {
        actions.setupStores();
        await actions.waitForChainSync();
        debugShowStartupInfo && toast("syncedToChain time: " + (new Date().getTime() - start.getTime()) / 1000 + "s");
        await actions.setupAutopilot(getStoreState().settings.autopilotEnabled);
        await actions.waitForGraphSync();
        debugShowStartupInfo && toast("syncedToGraph time: " + (new Date().getTime() - start.getTime()) / 1000 + "s");
      } catch (e) {
        debugShowStartupInfo && toast(e.message, 10000, "danger");
        return;
      }
    });

    const checkStatus = injections.lndMobile.index.checkStatus;
    const startLnd = injections.lndMobile.index.startLnd;

    const start = new Date();
    const lastSync = await getItemObject<number>(StorageItem.timeSinceLastSync);
    const firstSync = await getItemObject<boolean>(StorageItem.firstSync);
    actions.setFirstSync(firstSync);
    const debugShowStartupInfo = getStoreState().settings.debugShowStartupInfo;
    const fastInit = true; // differenceInDays(start, lastSync) <3 || firstSync;

    log.v("Running LndMobile checkStatus");
    const status = await checkStatus();
    log.v("status", [status]);
    if ((status & ELndMobileStatusCodes.STATUS_PROCESS_STARTED) !== ELndMobileStatusCodes.STATUS_PROCESS_STARTED) {
      log.i("lnd not started, starting lnd");
      const torEnabled = getStoreState().torEnabled;
      log.d("lnd started", [await startLnd(torEnabled)]);
      debugShowStartupInfo && toast("start lnd time: " + (new Date().getTime() - start.getTime()) / 1000 + "s", 1000);
    }
    else {
      log.i("lnd was already started");
      debugShowStartupInfo && toast("Lnd already started", undefined, "danger");
    }

    // Normal wallet unlock flow
    if ((status & ELndMobileStatusCodes.STATUS_WALLET_UNLOCKED) !== ELndMobileStatusCodes.STATUS_WALLET_UNLOCKED) {
      try {
        log.v("Unlocking wallet");
        SYNC_UNLOCK_WALLET
          ? await actions.unlockWallet()
          : actions.unlockWallet().then(
              () => debugShowStartupInfo && toast("UnlockWallet time: " + (new Date().getTime() - start.getTime()) / 1000 + "s", 1000)
            ).catch((e: any) => {
              debugShowStartupInfo && toast("Got error from unlockWallet: " + e.message, undefined, "danger");
              actions.setupStores();
              actions.waitForChainSync().then(
                async () => {
                  await actions.setupAutopilot(getStoreState().settings.autopilotEnabled);
                  await actions.waitForGraphSync();
                }
              );
            });
      } catch (e) {
        log.e("Error unlocking wallet:" + e.message);
        debugShowStartupInfo && toast("Error: Cannot unlock wallet", 10000, "danger");
        return
      }
    }
    // If a wallet was created, STATUS_WALLET_UNLOCKED would
    // already be set when this function is called.
    // This code path will also be used if we hot-reload the app (debug builds)
    else {
      log.v("Wallet was already unlocked");
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

    // tslint:disable-next-line: no-floating-promises
    fetch("https://mempool.space/api/blocks/tip/height").then(async (result) => {
      if (result.ok) {
        const bestBlockHeight = await result.text();
        actions.setBestBlockheight(Number.parseInt(bestBlockHeight, 10));
      }
      else {
        log.e("Unable to get best block height from 3rd party");
      }
    });

    if (fastInit) {
      actions.setReady(true);
    }

    // debugShowStartupInfo && toast("Initialize time: " + (new Date().getTime() - start.getTime()) / 1000 + "s", 1000);
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
      await dispatch.notificationManager.initialize();
      await dispatch.clipboardManager.initialize();
      await dispatch.deeplinkManager.initialize();
    } catch (e) {
      toast(e.message, 0, "danger", "OK");
      return;
    }
  }),

  unlockWallet: thunk(async (_, _2, { injections }) => {
    const unlockWallet = injections.lndMobile.wallet.unlockWallet;
    // const password = await getItem(StorageItem.walletPassword);
    const password = await getWalletPassword();
    if (!password) {
      throw new Error("Cannot find wallet password");
    }
    await unlockWallet(password);
  }),

  setupAutopilot: thunk(async (actions, enabled, { injections }) => {
    log.i("Setting up Autopilot");
    const modifyStatus = injections.lndMobile.autopilot.modifyStatus;
    const status = injections.lndMobile.autopilot.status;

    if (enabled) {
      try {
        await timeout(1000); // TODO(hsjoberg): why?
        const scores = await getNodeScores();
        // console.log(scores);
        const setScores = injections.lndMobile.autopilot.setScores;
        await setScores(scores);
      } catch (e) {
        log.e("Autopilot fail", [e]);
      }
    }

    do {
      try {
        await modifyStatus(enabled);
        actions.setAutopilotSet(enabled);
        log.i("Autopilot status:", [await status()]);
        break;
      } catch (e) {
        log.e("Error modifying Autopilot: " + e.message);
        await timeout(2000);
      }
    } while (true);
  }),

  getLightningPeers: thunk(async (actions, _, { injections }) => {
    const listPeers = injections.lndMobile.index.listPeers;
    const getNodeInfo = injections.lndMobile.index.getNodeInfo;

    const response = await listPeers();

    const lightningPeers = await Promise.all(response.peers.map(async (ipeer) => {
      let nodeInfo = undefined;
      try {
        nodeInfo = await getNodeInfo(ipeer.pubKey ?? "");
      } catch(e) { console.log(e) }
      return {
        peer: ipeer,
        node: nodeInfo?.node ?? undefined,
      }
    }));

    const sortedPeers = lightningPeers.sort((lightningNode, lightningNode2) => {
      if (lightningNode.peer.pubKey! < lightningNode2.peer.pubKey!) {
        return -1;
      } else if (lightningNode.peer.pubKey! > lightningNode2.peer.pubKey!){
        return 1;
      }
      return 0;
    });

    actions.setLightningPeers(sortedPeers);
  }),

  connectPeer: thunk(async (_, peer, { injections }) => {
    const connectPeer = injections.lndMobile.index.connectPeer;
    const [pubkey, host] = peer.split("@");
    await connectPeer(pubkey, host);
  }),

  disconnectPeer: thunk(async (_, pubkey, { injections }) => {
    const disconnectPeer = injections.lndMobile.index.disconnectPeer;
    return await disconnectPeer(pubkey);
  }),

  signMessage: thunk(async (_, message, { injections }) => {
    const signMessageNodePubkey = injections.lndMobile.wallet.signMessageNodePubkey;
    return await signMessageNodePubkey(stringToUint8Array(message));
  }),

  getInfo: thunk(async (actions, _, { injections }) => {
    const { getInfo } = injections.lndMobile.index;
    const info = await getInfo();
    actions.setNodeInfo(info);
  }),

  waitForChainSync: thunk(async (actions, _, { getState, injections }) => {
    const getInfo = injections.lndMobile.index.getInfo;
    const firstSync = getState().firstSync;
    let info;
    do {
      info = await getInfo();
      log.d(`blockHeight: ${info.blockHeight}, syncedToChain: ${info.syncedToChain}`);
      actions.setNodeInfo(info);

      if (info.syncedToChain !== true) {
        await timeout(firstSync ? 6000 : 1000);
      }
      else {
        log.d(JSON.stringify(info));
      }
    } while (!info.syncedToChain);

    if (firstSync) {
      await setItemObject(StorageItem.firstSync, false);
      actions.setFirstSync(false);

      // Connect to a lightning node
      // to get the network graph ASAP
      // in case DNS bootstrap fails
      setTimeout(async () => {
        try {
          const nodes = [
            ["030c3f19d742ca294a55c00376b3b355c3c90d61c6b6b39554dbc7ac19b141c14f", "52.50.244.44:9735"],    // Bitrefill
            ["03c2abfa93eacec04721c019644584424aab2ba4dff3ac9bdab4e9c97007491dda", "157.245.68.47:9735"],   // tippin.me
            ["03abf6f44c355dec0d5aa155bdbdd6e0c8fefe318eff402de65c6eb2e1be55dc3e", "18.221.23.28:9735"],    // OpenNode
            ["026b105ac13212c48714c6be9b11577a9ce10f10e1c88a45ce217e6331209faf8b", "52.224.178.244:9735"],  // LivingRoomofSatoshi.com
            ["02e7c42ae2952d7a71398e23535b53ffc60deb269acbc7c10307e6b797b91b1e79", "87.121.37.156:9735"],   // PeerName.com
            ["03864ef025fde8fb587d989186ce6a4a186895ee44a926bfc370e2c366597a3f8f", "34.239.230.56:9735"],   // ACINQ
          ];
          const randomNode = nodes[Math.floor(Math.random() * nodes.length)];
          log.i(`Connecting to ${randomNode[0]}@${randomNode[1]} to get LN network graph`);
          await injections.lndMobile.index.connectPeer(randomNode[0], randomNode[1]);
        } catch (e) {
          log.e("Connecting to node for channel graph failed in waitForChainSync firstSync=true", [e]);
        }
      }, 1000);
    }
    actions.setReady(true);
    actions.setSyncedToChain(info.syncedToChain);
    await setItemObject(StorageItem.timeSinceLastSync, new Date().getTime());
  }),

  waitForGraphSync: thunk(async (actions, _, { getState, injections }) => {
    log.d("Start waiting for graph sync");
    const { getInfo } = injections.lndMobile.index;
    let info;
    do {
      info = await getInfo();
      log.d(`syncedToGraph: ${info.syncedToGraph}`);
      actions.setNodeInfo(info);

      if (info.syncedToGraph !== true) {
        await timeout(1100);
      }
    } while (!info.syncedToGraph);
    actions.setSyncedToGraph(info.syncedToGraph);
  }),

  setNodeInfo: action((state, payload) => {
    state.nodeInfo = payload;
    if (state.initialKnownBlockheight === undefined) {
      state.initialKnownBlockheight = payload.blockHeight ?? 0;
    }
  }),
  setRPCServerReady: action((state, payload) => { state.rpcReady = payload; }),
  setReady: action((state, payload) => { state.ready = payload; }),
  setSyncedToChain: action((state, payload) => { state.syncedToChain = payload; }),
  setSyncedToGraph: action((state, payload) => { state.syncedToGraph = payload; }),
  setFirstSync: action((state, payload) => { state.firstSync = payload; }),
  setAutopilotSet: action((state, payload) => { state.autopilotSet = payload; }),
  setLightningPeers: action((state, payload) => {
    state.lightningPeers = payload.map((p) => ({
      peer: lnrpc.Peer.create(p.peer),
      node: lnrpc.LightningNode.create(p.node),
    }));
  }),

  setBestBlockheight: action((state, payload) => { state.bestBlockheight = payload; }),

  rpcReady: false,
  ready: false,
  syncedToChain: computed((state) => (state.nodeInfo?.syncedToChain) ?? false),
  syncedToGraph: computed((state) => (state.nodeInfo?.syncedToGraph) ?? false),
  firstSync: false,
  bestBlockheight: undefined,
  lightningPeers: [],
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

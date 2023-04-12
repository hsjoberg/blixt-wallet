import { Action, action, Thunk, thunk, Computed, computed } from "easy-peasy";

import { IStoreModel } from "./index";
import { IStoreInjections } from "./store";
import { lnrpc } from "../../proto/lightning";
import { getItemObject, StorageItem, setItemObject, getItem } from "../storage/app";
import { toast, timeout, stringToUint8Array } from "../utils";
import { Chain } from "../utils/build";

import logger from "./../utils/log";
const log = logger("Lightning");

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
  initialize: Thunk<ILightningModel, { start: Date }, IStoreInjections, IStoreModel>;

  setupStores: Thunk<ILightningModel, void, IStoreInjections, IStoreModel>;

  getInfo: Thunk<ILightningModel, void, IStoreInjections>;
  getNetworkInfo: Thunk<ILightningModel, void, IStoreInjections>;
  waitForChainSync: Thunk<ILightningModel, void, IStoreInjections>;
  waitForGraphSync: Thunk<ILightningModel, void, IStoreInjections>;
  checkRecoverInfo: Thunk<ILightningModel, void, IStoreInjections, IStoreModel, Promise<void>>;
  setupAutopilot: Thunk<ILightningModel, boolean, IStoreInjections>;
  getLightningPeers: Thunk<ILightningModel, void, IStoreInjections>;
  connectPeer: Thunk<ILightningModel, string, IStoreInjections>;
  disconnectPeer: Thunk<ILightningModel, string, IStoreInjections>;
  signMessage: Thunk<ILightningModel, string, IStoreInjections, {}, Promise<lnrpc.SignMessageResponse>>;

  setNetworkInfo: Action<ILightningModel, lnrpc.NetworkInfo>;
  setNodeInfo: Action<ILightningModel, lnrpc.IGetInfoResponse>;
  setRPCServerReady: Action<ILightningModel, boolean>;
  setReady: Action<ILightningModel, boolean>;
  setInitializeDone: Action<ILightningModel, boolean>;
  setSyncedToChain: Action<ILightningModel, boolean>;
  setSyncedToGraph: Action<ILightningModel, boolean>;
  setRecoverInfo: Action<ILightningModel, lnrpc.GetRecoveryInfoResponse>;
  setFirstSync: Action<ILightningModel, boolean>;
  setAutopilotSet: Action<ILightningModel, boolean>;
  setLightningPeers: Action<ILightningModel, ISetLightningPeersPayload[]>

  setBestBlockheight: Action<ILightningModel, number>;

  networkInfo?: lnrpc.NetworkInfo;
  nodeInfo?: lnrpc.IGetInfoResponse;
  rpcReady: boolean;
  syncedToChain: Computed<ILightningModel, boolean>;
  syncedToGraph: Computed<ILightningModel, boolean>;
  recoverInfo: lnrpc.GetRecoveryInfoResponse;
  isRecoverMode: Computed<ILightningModel, boolean>;
  ready: boolean;
  initializeDone: boolean;
  firstSync: boolean;
  autopilotSet?: boolean;
  lightningPeers: ILightningPeer[];

  bestBlockheight?: number;
  initialKnownBlockheight?: number;
}

export const lightning: ILightningModel = {
  initialize: thunk(async (actions, { start }, { getState, getStoreState }) => {
    log.d("getState().ready: " + getState().ready);
    if (getState().ready)  {
      log.d("Lightning store already started");
      return;
    }

    log.i("Starting");

    const lastSync = await getItemObject<number>(StorageItem.timeSinceLastSync);
    const firstSync = await getItemObject<boolean>(StorageItem.firstSync);
    actions.setFirstSync(firstSync);
    const debugShowStartupInfo = getStoreState().settings.debugShowStartupInfo;
    const fastInit = true; // differenceInDays(start, lastSync) <3 || firstSync;
    if (fastInit) {
      actions.setReady(true);
    }
    actions.setRPCServerReady(true);

    (async () => {
      try {
        actions.setupStores();
        actions.checkRecoverInfo()
          .then(() => debugShowStartupInfo && toast("checkRecoverInfo time: " + (new Date().getTime() - start.getTime()) / 1000 + "s"))
          .catch((error) => toast("checkRecoverInfo error: " + error.message, undefined, "danger"));
        await actions.waitForChainSync();
        debugShowStartupInfo && toast("syncedToChain time: " + (new Date().getTime() - start.getTime()) / 1000 + "s");
        await actions.setupAutopilot(getStoreState().settings.autopilotEnabled);
        await actions.waitForGraphSync();
        debugShowStartupInfo && toast("syncedToGraph time: " + (new Date().getTime() - start.getTime()) / 1000 + "s");
        actions.setInitializeDone(true);
      } catch (e) {
        debugShowStartupInfo && toast("Error in initialization task: " + e.message, 10000, "danger");
        return;
      }
    })();

    (async () => {
      try {
        // tslint:disable-next-line: no-floating-promises
        const result = await fetch(Chain === "mainnet"
          ? "https://mempool.space/api/blocks/tip/height"
          : "https://mempool.space/testnet/api/blocks/tip/height"
        );
        if (result.ok) {
          const bestBlockHeight = await result.text();
          actions.setBestBlockheight(Number.parseInt(bestBlockHeight, 10));
        } else {
          log.e("Unable to get best block height from mempool.space");
        }
      } catch (e) {
        debugShowStartupInfo && toast(e.message, 10000, "danger");
        return;
      }
    })();

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
        dispatch.scheduledGossipSync.initialize(),
        dispatch.notificationManager.initialize(),
        dispatch.clipboardManager.initialize(),
        dispatch.deeplinkManager.initialize(),
        dispatch.blixtLsp.initialize(),
      ]);
    } catch (e) {
      toast(e.message, 0, "danger", "OK");
      return;
    }
  }),

  setupAutopilot: thunk(async (actions, enabled, { injections }) => {
    log.i("Setting up Autopilot");
    const modifyStatus = injections.lndMobile.autopilot.modifyStatus;
    const status = injections.lndMobile.autopilot.status;

    if (enabled) {
      try {
        await timeout(5000);
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
    return await connectPeer(pubkey, host);
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

  getNetworkInfo: thunk(async (actions, _, { injections }) => {
    const networkInfo = injections.lndMobile.index.getNetworkInfo;
    const info = await networkInfo();
    actions.setNetworkInfo(info);
  }),

  checkRecoverInfo: thunk((async (actions, _, { getState, injections }) => {
    while (true) {
      try {
        const info = await injections.lndMobile.index.getRecoveryInfo();
        log.i("Recovery info", [info, info.recoveryMode, info.recoveryFinished, info.progress]);
        actions.setRecoverInfo(info);
        if (!info.recoveryMode || info.recoveryFinished) {
          log.i("Recovery either finished or not activated");
          break;
        }
      } catch (e) {
        log.e("checkRecoverInfo: " + e.message);
      }
      await timeout(10000);
    }
  })),

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
            ["02004c625d622245606a1ea2c1c69cfb4516b703b47945a3647713c05fe4aaeb1c", "172.81.178.151:9735"],  // WalletOfSatoshi.com [2]
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

    if (info.syncedToChain === false) {
      log.i("waitForGraphSync: syncedToChain flipped to false again, calling waitForChainSync");
      actions.waitForChainSync();
    }
  }),

  setNodeInfo: action((state, payload) => {
    state.nodeInfo = payload;
    if (state.initialKnownBlockheight === undefined) {
      state.initialKnownBlockheight = payload.blockHeight ?? 0;
    }
  }),
  setNetworkInfo: action((state, payload) => {
    state.networkInfo = payload;
  }),
  setRPCServerReady: action((state, payload) => { state.rpcReady = payload; }),
  setReady: action((state, payload) => { state.ready = payload; }),
  setInitializeDone: action((state, payload) => { state.initializeDone = payload; }),
  setSyncedToChain: action((state, payload) => { state.syncedToChain = payload; }),
  setSyncedToGraph: action((state, payload) => { state.syncedToGraph = payload; }),
  setRecoverInfo: action((state, payload) => { state.recoverInfo = payload }),
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
  initializeDone: false,
  syncedToChain: computed((state) => (state.nodeInfo?.syncedToChain) ?? false),
  syncedToGraph: computed((state) => (state.nodeInfo?.syncedToGraph) ?? false),
  isRecoverMode: computed((state) => state.recoverInfo.recoveryMode),
  recoverInfo: lnrpc.GetRecoveryInfoResponse.create({
    progress: 0,
    recoveryFinished: false,
    recoveryMode: false,
  }),
  firstSync: false,
  bestBlockheight: undefined,
  lightningPeers: [],
};

const getNodeScores = async () => {
  if (Chain === "testnet") {
    return { "036b7130b27a23d6fe1d55c1d3bed9e6da5a17090588b0834e8200e0d50ee6886a": 1 };
  } else if (Chain === "mainnet") {
    return { "0230a5bca558e6741460c13dd34e636da28e52afd91cf93db87ed1b0392a7466eb": 1 };
  }

  // TODO(hsjoberg): needs cleanup

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

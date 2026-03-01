import { Action, Computed, Thunk, action, computed, thunk } from "easy-peasy";
import { StorageItem, getItemObject, setItemObject } from "../storage/app";
import { stringToUint8Array, timeout, toast } from "../utils";
import { Chain } from "../utils/build";
import { IStoreModel } from "./index";

import {
  connectPeer,
  disconnectPeer,
  getInfo,
  getNetworkInfo,
  getNodeInfo,
  getRecoveryInfo,
  listPeers,
  signMessage,
} from "react-native-turbo-lnd";
import {
  GetInfoResponse,
  GetRecoveryInfoResponse,
  GetRecoveryInfoResponseSchema,
  LightningNode,
  LightningNodeSchema,
  NetworkInfo,
  Peer,
  PeerSchema,
  SignMessageResponse,
} from "react-native-turbo-lnd/protos/lightning_pb";
import { create } from "@bufbuild/protobuf";

import logger from "./../utils/log";
import { PLATFORM } from "../utils/constants";
const log = logger("Lightning");

export type LndChainBackend = "neutrino" | "bitcoindWithZmq" | "bitcoindWithRpcPolling";

interface ILightningPeer {
  peer: Peer;
  node?: LightningNode;
}

interface ISetLightningPeersPayload {
  peer: Peer;
  node?: LightningNode;
}

export interface ILightningModel {
  initialize: Thunk<ILightningModel, { start: Date }, any, IStoreModel>;

  setupStores: Thunk<ILightningModel, void, any, IStoreModel>;

  getInfo: Thunk<ILightningModel, void, any>;
  getNetworkInfo: Thunk<ILightningModel, void, any>;
  waitForChainSync: Thunk<ILightningModel, void, any>;
  waitForGraphSync: Thunk<ILightningModel, void, any>;
  checkRecoverInfo: Thunk<ILightningModel, void, any, IStoreModel, Promise<void>>;
  getLightningPeers: Thunk<ILightningModel, void, any>;
  connectPeer: Thunk<ILightningModel, string, any>;
  disconnectPeer: Thunk<ILightningModel, string, any>;
  signMessage: Thunk<ILightningModel, string, any, {}, Promise<SignMessageResponse>>;

  setNetworkInfo: Action<ILightningModel, NetworkInfo>;
  setNodeInfo: Action<ILightningModel, GetInfoResponse>;
  setRPCServerReady: Action<ILightningModel, boolean>;
  setReady: Action<ILightningModel, boolean>;
  setInitializeDone: Action<ILightningModel, boolean>;
  setSyncedToChain: Action<ILightningModel, boolean>;
  setSyncedToGraph: Action<ILightningModel, boolean>;
  setRecoverInfo: Action<ILightningModel, GetRecoveryInfoResponse>;
  setFirstSync: Action<ILightningModel, boolean>;
  setLightningPeers: Action<ILightningModel, ISetLightningPeersPayload[]>;

  setBestBlockheight: Action<ILightningModel, number>;

  networkInfo?: NetworkInfo;
  nodeInfo?: GetInfoResponse;
  rpcReady: boolean;
  syncedToChain: Computed<ILightningModel, boolean>;
  syncedToGraph: Computed<ILightningModel, boolean>;
  recoverInfo: GetRecoveryInfoResponse;
  isRecoverMode: Computed<ILightningModel, boolean>;
  ready: boolean;
  initializeDone: boolean;
  firstSync: boolean;
  lightningPeers: ILightningPeer[];

  bestBlockheight?: number;
  initialKnownBlockheight?: number;
}

export const lightning: ILightningModel = {
  initialize: thunk(async (actions, { start }, { getState, getStoreState, getStoreActions }) => {
    log.d("getState().ready: " + getState().ready);
    if (getState().ready) {
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
        actions
          .checkRecoverInfo()
          .then(
            () =>
              debugShowStartupInfo &&
              toast(
                "checkRecoverInfo time: " + (new Date().getTime() - start.getTime()) / 1000 + "s",
              ),
          )
          .catch((error: any) =>
            toast("checkRecoverInfo error: " + error.message, undefined, "danger"),
          );
        await actions.waitForChainSync();

        debugShowStartupInfo &&
          toast("syncedToChain time: " + (new Date().getTime() - start.getTime()) / 1000 + "s");
        await getStoreActions().autopilot.checkAutopilot();
        await actions.waitForGraphSync();
        debugShowStartupInfo &&
          toast("syncedToGraph time: " + (new Date().getTime() - start.getTime()) / 1000 + "s");
        await getStoreActions().autopilot.checkAutopilot();
        actions.setInitializeDone(true);
      } catch (e: any) {
        debugShowStartupInfo &&
          toast("Error in initialization task: " + e.message, 10000, "danger");
        return;
      }
    })();

    (async () => {
      try {
        // tslint:disable-next-line: no-floating-promises
        const result = await fetch(
          Chain === "mainnet"
            ? "https://mempool.space/api/blocks/tip/height"
            : "https://mempool.space/testnet/api/blocks/tip/height",
        );
        if (result.ok) {
          const bestBlockHeight = await result.text();
          actions.setBestBlockheight(Number.parseInt(bestBlockHeight, 10));
        } else {
          log.e("Unable to get best block height from mempool.space");
        }
      } catch (e: any) {
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
        dispatch.autopilot.initialize(),
        dispatch.transaction.checkOpenTransactions(),
        dispatch.scheduledSync.initialize(),
        dispatch.notificationManager.initialize(),
        dispatch.clipboardManager.initialize(),
        dispatch.deeplinkManager.initialize(),
        dispatch.blixtLsp.initialize(),
        dispatch.channelAcceptanceManager.initialize(),
        dispatch.lightningBox.initialize(),
      ]);

      if (PLATFORM === "android") {
        await Promise.all([
          // await dispatch.google.initialize(),
          await dispatch.googleDriveBackup.initialize(),
        ]);
      } else if (PLATFORM === "ios" || PLATFORM === "macos") {
        await dispatch.iCloudBackup.initialize();
      }

      // On startup, if persistent mode is enabled
      // Start the notifee foreground service, else stop it.
      // The function doesn't throw, so it is ok to start/stop it
      // Even if it is already started or stopped
      if (PLATFORM === "android" && (await getItemObject(StorageItem.persistentServicesEnabled))) {
        await dispatch.notificationManager.initialize();
        await dispatch.notificationManager.startPersistentService();
      } else {
        await dispatch.notificationManager.stopPersistentService();
      }
    } catch (e: any) {
      toast(e.message, 0, "danger", "OK");
      return;
    }
  }),

  getLightningPeers: thunk(async (actions, _, {}) => {
    const response = await listPeers({});

    const lightningPeers = await Promise.all(
      response.peers.map(async (ipeer) => {
        let nodeInfo = undefined;
        try {
          nodeInfo = await getNodeInfo({
            pubKey: ipeer.pubKey,
          });
        } catch (e) {
          console.log(e);
        }
        return {
          peer: ipeer,
          node: nodeInfo?.node ?? undefined,
        };
      }),
    );

    const sortedPeers = lightningPeers.sort((lightningNode, lightningNode2) => {
      if (lightningNode.peer.pubKey! < lightningNode2.peer.pubKey!) {
        return -1;
      } else if (lightningNode.peer.pubKey! > lightningNode2.peer.pubKey!) {
        return 1;
      }
      return 0;
    });

    actions.setLightningPeers(sortedPeers);
  }),

  connectPeer: thunk(async (_, peer, {}) => {
    const [pubkey, host] = peer.trim().split("@");
    return await connectPeer({
      addr: {
        pubkey,
        host,
      },
    });
  }),

  disconnectPeer: thunk(async (_, pubkey, {}) => {
    return await disconnectPeer({
      pubKey: pubkey,
    });
  }),

  signMessage: thunk(async (_, message, {}) => {
    return await signMessage({
      msg: stringToUint8Array(message),
    });
  }),

  getInfo: thunk(async (actions, _, {}) => {
    const info = await getInfo({});
    actions.setNodeInfo(info);
  }),

  getNetworkInfo: thunk(async (actions, _, {}) => {
    const info = await getNetworkInfo({});
    actions.setNetworkInfo(info);
  }),

  checkRecoverInfo: thunk(async (actions, _, {}) => {
    while (true) {
      try {
        const info = await getRecoveryInfo({});
        log.i("Recovery info", [info, info.recoveryMode, info.recoveryFinished, info.progress]);
        actions.setRecoverInfo(info);
        if (!info.recoveryMode || info.recoveryFinished) {
          log.i("Recovery either finished or not activated");
          break;
        }
      } catch (e: any) {
        log.e("checkRecoverInfo: " + e.message);
      }
      await timeout(10000);
    }
  }),

  waitForChainSync: thunk(async (actions, _, { getState }) => {
    const firstSync = getState().firstSync;
    let info;
    do {
      info = await getInfo({});
      log.d(`blockHeight: ${info.blockHeight}, syncedToChain: ${info.syncedToChain}`);
      actions.setNodeInfo(info);

      if (info.syncedToChain !== true) {
        await timeout(firstSync ? 6000 : 1000);
      } else {
        log.d(JSON.stringify(info));
      }
    } while (!info.syncedToChain);

    if (firstSync) {
      await setItemObject(StorageItem.firstSync, false);
      actions.setFirstSync(false);

      // Connect to a lightning node
      // to get the network graph ASAP
      // in case DNS bootstrap fails
      if (Chain === "mainnet") {
        setTimeout(async () => {
          try {
            const nodes = [
              [
                "030c3f19d742ca294a55c00376b3b355c3c90d61c6b6b39554dbc7ac19b141c14f",
                "52.50.244.44:9735",
              ], // Bitrefill
              [
                "03c2abfa93eacec04721c019644584424aab2ba4dff3ac9bdab4e9c97007491dda",
                "157.245.68.47:9735",
              ], // tippin.me
              [
                "03abf6f44c355dec0d5aa155bdbdd6e0c8fefe318eff402de65c6eb2e1be55dc3e",
                "18.221.23.28:9735",
              ], // OpenNode
              [
                "02004c625d622245606a1ea2c1c69cfb4516b703b47945a3647713c05fe4aaeb1c",
                "172.81.178.151:9735",
              ], // WalletOfSatoshi.com [2]
              [
                "02e7c42ae2952d7a71398e23535b53ffc60deb269acbc7c10307e6b797b91b1e79",
                "87.121.37.156:9735",
              ], // PeerName.com
              [
                "03864ef025fde8fb587d989186ce6a4a186895ee44a926bfc370e2c366597a3f8f",
                "34.239.230.56:9735",
              ], // ACINQ
            ];
            const randomNode = nodes[Math.floor(Math.random() * nodes.length)];
            log.i(`Connecting to ${randomNode[0]}@${randomNode[1]} to get LN network graph`);
            await connectPeer({
              addr: {
                pubkey: randomNode[0],
                host: randomNode[1],
              },
            });
          } catch (e) {
            log.e(
              "Connecting to node for channel graph failed in waitForChainSync firstSync=true",
              [e],
            );
          }
        }, 1000);
      }
    }
    actions.setReady(true);
    actions.setSyncedToChain(info.syncedToChain);
    await setItemObject(StorageItem.timeSinceLastSync, new Date().getTime());
  }),

  waitForGraphSync: thunk(async (actions, _, {}) => {
    log.d("Start waiting for graph sync");
    let info;
    do {
      info = await getInfo({});
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
  setRPCServerReady: action((state, payload) => {
    state.rpcReady = payload;
  }),
  setReady: action((state, payload) => {
    state.ready = payload;
  }),
  setInitializeDone: action((state, payload) => {
    state.initializeDone = payload;
  }),
  setSyncedToChain: action((state, payload) => {
    state.syncedToChain = payload;
  }),
  setSyncedToGraph: action((state, payload) => {
    state.syncedToGraph = payload;
  }),
  setRecoverInfo: action((state, payload) => {
    state.recoverInfo = payload;
  }),
  setFirstSync: action((state, payload) => {
    state.firstSync = payload;
  }),
  setLightningPeers: action((state, payload) => {
    state.lightningPeers = payload.map((p) => ({
      // peer: lnrpc.Peer.create(p.peer),
      peer: create(PeerSchema, p.peer),
      node: create(LightningNodeSchema, p.node),
    }));
  }),

  setBestBlockheight: action((state, payload) => {
    state.bestBlockheight = payload;
  }),

  rpcReady: false,
  ready: false,
  initializeDone: false,
  syncedToChain: computed((state) => state.nodeInfo?.syncedToChain ?? false),
  syncedToGraph: computed((state) => state.nodeInfo?.syncedToGraph ?? false),
  isRecoverMode: computed((state) => state.recoverInfo.recoveryMode),
  recoverInfo: create(GetRecoveryInfoResponseSchema, {
    progress: 0,
    recoveryFinished: false,
    recoveryMode: false,
  }),
  firstSync: false,
  bestBlockheight: undefined,
  lightningPeers: [],
};

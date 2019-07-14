import { NativeModules, DeviceEventEmitter } from "react-native";
import { Action, action, Thunk, thunk } from "easy-peasy";
import {
  IGetInfoResponse,
  getInfo,
  unlockWallet,
  pendingChannels,
  listChannels,
  channelBalance,
  sendPaymentSync,
  decodePayReq,
  addInvoice,
  IAddInvoiceResponse,
  ISendPaymentSyncResponse,
} from "../lightning/index";
import { IStoreModel } from "./index";
import { ITransaction } from "../storage/database/transaction";


interface ILightningModelSendPaymentPayload {
  paymentRequest: string;
}


interface ILightningModAddInvoicePayload {
  description: string;
  sat: number;
  expiry?: number;
}

const timeout = (time: number) => new Promise((resolve) => setTimeout(() => resolve(), time));

export interface ILightningModel {
  initialize: Thunk<ILightningModel, undefined, any, IStoreModel>;
  unlockWallet: Thunk<ILightningModel>;
  getInfo: Thunk<ILightningModel>;
  setNodeInfo: Action<ILightningModel, IGetInfoResponse>;

  getBalance: Thunk<ILightningModel, undefined>;
  setBalance: Action<ILightningModel, number>;

  decodePaymentRequest: Thunk<ILightningModel, { bolt11: string }, any, any, any>;
  addInvoice: Thunk<ILightningModel, ILightningModAddInvoicePayload, any, IStoreModel, Promise<IAddInvoiceResponse>>;
  sendPayment: Thunk<ILightningModel, ILightningModelSendPaymentPayload, any, IStoreModel, Promise<ISendPaymentSyncResponse>>;

  subscribeInvoice: Thunk<ILightningModel>;
  setInvoiceSubscriptionStarted: Action<ILightningModel, boolean>;
  subscribeChannelUpdates: Thunk<ILightningModel>;
  setChannelUpdatesSubscriptionStarted: Action<ILightningModel, boolean>;

  nodeInfo?: IGetInfoResponse;
  balance: number;
  invoiceSubscriptionStarted: boolean;
  channelUpdatesSubscriptionStarted: boolean;
  syncedToChain: boolean;
}

export const lightning: ILightningModel = {
  initialize: thunk(async (actions, _, { getState }) => {
    let gotMacaroon = false;
    do {
      console.log("Trying to get macaroon");
      gotMacaroon = await NativeModules.LndGrpc.readMacaroon();
      if (!gotMacaroon) {
        await timeout(500);
      }
    } while (!gotMacaroon);

    // Attempt to unlock wallet:
    await actions.unlockWallet();
    // Get general node information:
    await actions.getInfo();
    await actions.getBalance();

    // Start subscriptions:
    NativeModules.LndGrpc.startInvoiceSubscription();

    if (!(getState().invoiceSubscriptionStarted)) {
      actions.subscribeInvoice();
    }

    return true;
  }),

  unlockWallet: thunk(async () => {
    let unlockWalletDone = false;
    do {
      try {
        console.log("try unlockWallet");
        await unlockWallet("test1234");
        unlockWalletDone = true;
      }
      catch (e) {
        console.log(e.status.code);
        switch (e.status.code) {
          // Already unlocked
          case "UNIMPLEMENTED":
            unlockWalletDone = true;
            break;
          // lnd gRPC not online
          // Trying again after 1s
          case "UNAVAILABLE":
            console.log("lnd gRPC not online, trying again after 1000ms");
            await timeout(300);
            break;
          case "UNKNOWN":
            console.log("Unknown error");
            await timeout(300);
            break;
          default:
            console.log("Default");
            await timeout(300);
            break;
        }
      }
    } while (!unlockWalletDone);
    console.log("Wallet unlocked");
  }),

  getInfo: thunk(async (actions) => {
    let getInfoDone = false;
    do {
      try {
        console.log("try getInfo");
        const info = await getInfo();
        console.log("info", info);
        actions.setNodeInfo(info);

        if (info.syncedToChain !== true) {
          await timeout(700);
        }
        else {
          getInfoDone = true;
        }
      }
      catch (e) {
        console.log(e.status.code);
        switch (e.status.code) {
          // Something weird has happened
          case "UNIMPLEMENTED":
            throw new Error("Error running gRPC GetInfo");
          // lnd gRPC is not completely online yet
          // Trying again after 1s
          case "UNAVAILABLE":
            console.log("lnd gRPC LightningRPC not online, trying again after 1000ms");
            await timeout(1000);
            break;
          case "UNKNOWN":
            console.log("Unknown error");
            await timeout(1000);
            break;
          default:
            console.log("Default");
            await timeout(1000);
            break;
        }
      }
    } while (!getInfoDone);
  }),

  setNodeInfo: action((state, payload) => {
    state.nodeInfo = payload;
  }),

  getBalance: thunk(async (actions) => {
    const response = await channelBalance();
    actions.setBalance(response.balance);
  }),
  setBalance: action((state, payload) => {
    state.balance = payload;
  }),
  setInvoiceSubscriptionStarted: action((state, payload) => {
    state.invoiceSubscriptionStarted = payload;
  }),

  sendPayment: thunk(async (_, payload) => {
    const result = await sendPaymentSync(payload.paymentRequest);
    return result;
  }),

  addInvoice: thunk(async (_, { description, sat, expiry }) => {
    const result = await addInvoice(sat, description, expiry);
    return result as IAddInvoiceResponse;
  }),

  decodePaymentRequest: thunk(async (_, payload) => {
    const result = await decodePayReq(payload.bolt11);
    return result;
  }),


  subscribeInvoice: thunk((actions, _, { getState, dispatch }) => {
    if (getState().invoiceSubscriptionStarted) {
      console.log("WARNING: Lightning.subscribeInvoice() called when subsription already started");
      return;
    }
    console.log("Starting transaction subscription");
    DeviceEventEmitter.addListener("invoice", async (e: any) => {
      console.log("New invoice event");
      console.log(e);

      const bolt11 = await decodePayReq(e.paymentRequest);
      // TODO in the future we should handle
      // both value (the requested amount in the payreq)
      // and amtPaidMsat (the actual amount paid)
      const transaction: ITransaction = {
        description: e.description,
        value: e.value,
        valueMsat: e.value * 1000,
        date: e.date,
        expire: e.date + bolt11.expiry,
        remotePubkey: bolt11.destination,
        status: e.state,
        paymentRequest: e.paymentRequest,
        rHash: bolt11.paymentHash,
      };
      await dispatch.transaction.syncTransaction(transaction);
    });
  }),

  subscribeChannelUpdates: thunk((actions, _, { getState, dispatch }) => {
    DeviceEventEmitter.addListener("channel", async (e: any) => {
      console.log("New channel event");
      console.log(e);
    });
  }),

  balance: 0,
  invoiceSubscriptionStarted: false,
  channelUpdatesSubscriptionStarted: false,
  syncedToChain: false,
};


// https://stackoverflow.com/questions/34309988/byte-array-to-hex-string-conversion-in-javascript
function toHexString(byteArray: number[]) {
  return Array.from(byteArray, function(byte) {
    return ("0" + (byte & 0xFF).toString(16)).slice(-2);
  }).join("")
}

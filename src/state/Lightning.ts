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
  setNodeInfo: Action<ILightningModel, IGetInfoResponse>;

  getBalance: Thunk<ILightningModel, undefined>;
  setBalance: Action<ILightningModel, number>;
  setSubscriptionStarted: Action<ILightningModel, boolean>;

  decodePaymentRequest: Thunk<ILightningModel, { bolt11: string }, any, any, any>;
  addInvoice: Thunk<ILightningModel, ILightningModAddInvoicePayload, any, IStoreModel, Promise<IAddInvoiceResponse>>;
  sendPayment: Thunk<ILightningModel, ILightningModelSendPaymentPayload>;

  nodeInfo?: IGetInfoResponse;
  balance: number;
  subscriptionStarted: boolean;
}

export default {
  initialize: thunk(async (actions, payload, { getState, getStoreState, dispatch }) => {
    // Attempt to unlock wallet:
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
    } while (!unlockWalletDone);
    console.log("Wallet unlocked");

    // Get general node information:
    let getInfoDone = false;
    do {
      try {
        console.log("try getInfo");
        const info = await getInfo();
        actions.setNodeInfo(info);
        getInfoDone = true;
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

    await actions.getBalance();


    console.log("Starting transaction subscription");
    NativeModules.LndGrpc.startInvoiceSubscription();
    DeviceEventEmitter.addListener("invoiceStart", (e: any) => {
      console.log("New invoiceStart event");
      console.log(e);
      actions.setSubscriptionStarted(e.start);
    });

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


    return true;
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
  setSubscriptionStarted: action((state, payload) => {
    state.subscriptionStarted = payload;
  }),

  sendPayment: thunk(async (actions, payload) => {
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

  balance: 0,
  subscriptionStarted: false,
} as ILightningModel;


// https://stackoverflow.com/questions/34309988/byte-array-to-hex-string-conversion-in-javascript
function toHexString(byteArray: number[]) {
  return Array.from(byteArray, function(byte) {
    return ("0" + (byte & 0xFF).toString(16)).slice(-2);
  }).join("")
}

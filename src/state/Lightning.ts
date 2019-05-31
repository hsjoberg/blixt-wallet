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
} from "../lightning/index";


interface ILightningModelSendPaymentPayload {
  paymentRequest: string;
}

const timeout = (time: number) => new Promise((resolve) => setTimeout(() => resolve(), time));

export interface ILightningModel {
  initialize: Thunk<ILightningModel, undefined>;
  setNodeInfo: Action<ILightningModel, IGetInfoResponse>;

  getBalance: Thunk<ILightningModel, undefined>;
  setBalance: Action<ILightningModel, number>;

  decodePaymentRequest: Thunk<ILightningModel, { bolt11: string }, any, any, any>;
  sendPayment: Thunk<ILightningModel, ILightningModelSendPaymentPayload>;

  nodeInfo?: IGetInfoResponse;
  balance: number;
}

export default {
  initialize: thunk(async (actions, payload, { getState }) => {
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

  sendPayment: thunk(async (state, payload) => {
    const result = await sendPaymentSync(payload.paymentRequest);
    return result;
  }),

  decodePaymentRequest: thunk(async (_, payload) => {
    const result = await decodePayReq(payload.bolt11);
    return result;
  }),

  balance: 0,
} as ILightningModel;

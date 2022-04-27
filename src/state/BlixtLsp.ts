import { NativeModules } from "react-native";
import { Action, action, computed, Computed, Thunk, thunk } from "easy-peasy";
import { generateSecureRandom } from "react-native-securerandom";

import { IStoreInjections } from "./store";
import { bytesToHexString, stringToUint8Array, timeout } from "../utils";
import { IStoreModel } from "./index";
import { LndMobileEventEmitter } from "../utils/event-listener";
import { checkLndStreamErrorResponse } from "../utils/lndmobile";
import * as base64 from "base64-js";
import { PLATFORM } from "../utils/constants";

import logger from "./../utils/log";
const log = logger("BlixtLsp");

type UserState = "NOT_REGISTERED" | "REGISTERED" | "WAITING_FOR_SETTLEMENT";

export interface IErrorResponse {
  status: "ERROR";
  reason: string;
}

export interface IOnDemandChannelServiceStatusResponse {
  status: boolean;
  approxFeeSat: number;
  minimumPaymentSat: number;
  peer: string;
}

export interface IOnDemandChannelRegisterRequest {
  pubkey: string;
  signature: string; // Message has to be REGISTER base64
  preimage: string;
  amountSat: number;
}

export interface IOnDemandChannelRegisterOkResponse {
  status: "OK";
  servicePubkey: string;
  fakeChannelId: string;
  cltvExpiryDelta: number;
  feeBaseMsat: number;
  feeProportionalMillionths: number;
}

export interface IOnDemandChannelCheckStatusRequest {
  pubkey: string;
  signature: string;
}

export interface IOnDemandChannelCheckStatusResponse {
  state: UserState;
  unclaimedAmountSat: number;
}

export interface IOnDemandChannelClaimRequest {
  pubkey: string;
  signature: string; // Message has to be REGISTER base64
}

export interface IOnDemandChannelClaimResponse {
  status: "OK";
  amountSat: number;
}

export interface IOnDemandChannelRegisterErrorResponse extends IErrorResponse {}
export interface IOnDemandChannelUnknownRequestResponse extends IErrorResponse {}

export interface IOndemandChannel {
  checkOndemandChannelService: Thunk<IOndemandChannel, void, IStoreInjections>;
  connectToService: Thunk<IOndemandChannel, undefined, IStoreInjections, IStoreModel, Promise<boolean>>;
  addInvoice: Thunk<IOndemandChannel, { sat: number; description: string }, IStoreInjections, IStoreModel>;

  serviceStatus: Thunk<IOndemandChannel, void, IStoreInjections, IStoreModel, Promise<IOnDemandChannelServiceStatusResponse>>;
  checkStatus: Thunk<IOndemandChannel, void, IStoreInjections, IStoreModel, Promise<IOnDemandChannelCheckStatusResponse>>;
  register: Thunk<IOndemandChannel, { preimage: Uint8Array; amount: number; }, IStoreInjections, IStoreModel, Promise<IOnDemandChannelRegisterOkResponse>>;
  claim: Thunk<IOndemandChannel, void, IStoreInjections, IStoreModel, Promise<IOnDemandChannelRegisterOkResponse>>;

  registerInvoicePreimage: Uint8Array | null;
  setRegisterInvoicePreimage: Action<IOndemandChannel, Uint8Array | null>;

  setStatus: Action<IOndemandChannel, IOnDemandChannelServiceStatusResponse | null>;

  status: IOnDemandChannelServiceStatusResponse | null;
  serviceActive: Computed<IOndemandChannel, boolean>;
}

export interface IBlixtLsp {
  initialize: Thunk<IBlixtLsp, void, IStoreInjections, IStoreModel>;

  // On-demand Channels
  ondemandChannel: IOndemandChannel;
};

export const blixtLsp: IBlixtLsp = {
  initialize: thunk(async (actions, _, { getState, getStoreState, getStoreActions }) => {
    log.d("Initializing");

    // Expect subscription to be started in Channel store
    LndMobileEventEmitter.addListener("SubscribeChannelEvents", async (e: any) => {
      log.d("SubscribeChannelEvents");
      const error = checkLndStreamErrorResponse("SubscribeChannelEvents", e);
      if (error === "EOF") {
        return;
      } else if (error) {
        log.d("Got error from SubscribeChannelEvents", [error]);
        throw error;
      }

      // const decodeChannelEvent = injections.lndMobile.channel.decodeChannelEvent;
      // const channelEvent = decodeChannelEvent(e.data);

      // This code isn't very good:
      const registerInvoicePreimage = getState().ondemandChannel.registerInvoicePreimage;
      if (registerInvoicePreimage) {
        log.d("Has registerInvoicePreimage");
        const tx = getStoreState().transaction.getTransactionByPreimage(registerInvoicePreimage);
        if (!tx) {
          log.e("Couldn't find transaction while atttempting to settle BlixtLSP invoice", [tx]);
          return;
        }
        tx.status = "SETTLED";
        getStoreActions().transaction.syncTransaction(tx);
        log.i("tx should be synced");
        actions.ondemandChannel.setRegisterInvoicePreimage(null);
      }
    });
  }),

  ondemandChannel: {
    checkOndemandChannelService: thunk(async (actions) => {
      try {
        const serviceStatus = await actions.serviceStatus();
        log.i("serviceStatus", [serviceStatus]);
        actions.setStatus(serviceStatus);
      } catch (error) {
        log.w("checkOndemandChannelService failed", [error]);
        actions.setStatus(null);
      }
    }),
    // Requests
    serviceStatus: thunk(async (_, _2, { getStoreState }) => {
      log.i("serviceStatus");
      const dunderServer = getStoreState().settings.dunderServer;
      return (await fetch(`${dunderServer}/ondemand-channel/service-status`)).json();
    }),

    checkStatus: thunk(async (_, _2, { getStoreState, injections }) => {
      log.i("checkStatus");
      const dunderServer = getStoreState().settings.dunderServer;

      const signMessageResult = await injections.lndMobile.wallet.signMessageNodePubkey(stringToUint8Array("CHECKSTATUS"));

      const request = JSON.stringify({
        pubkey: getStoreState().lightning.nodeInfo?.identityPubkey,
        signature: signMessageResult.signature,
      });

      return (await fetch(`${dunderServer}/ondemand-channel/check-status`, {
        body: request,
        method: "POST",
      })).json();
    }),

    connectToService: thunk((async (actions, _, { getStoreActions }) => {
      const result = await actions.serviceStatus();
      log.d("serviceStatus", [result]);

      let connectToPeer = false;
      let attempt = 3;
      while (attempt--) {
        try {
          connectToPeer = !!(await getStoreActions().lightning.connectPeer(result.peer));
        } catch (e) {
          if (!e.message.includes("already connected to peer")) {
            log.i(`Failed to connect: ${e.message}.`);
            await timeout(1000);
          } else {
            connectToPeer = true;
            break;
          }
        }
      }
      return connectToPeer;
    })),

    addInvoice: thunk((async (actions, { sat, description }, { getStoreActions }) => {
      const preimage = await generateSecureRandom(32);
      const result = await actions.register({
        preimage,
        amount: sat,
      });
      console.log(result);

      const invoice = await getStoreActions().receive.addInvoiceBlixtLsp({
        sat,
        preimage,
        chanId: result.fakeChannelId,
        cltvExpiryDelta: result.cltvExpiryDelta,
        feeBaseMsat: result.feeBaseMsat,
        feeProportionalMillionths: result.feeProportionalMillionths,
        description,
        servicePubkey: result.servicePubkey,
      });
      console.log(invoice);
      return invoice;
    })),

    register: thunk(async (actions, { preimage, amount }, { getStoreState, injections }) => {
      log.i("register");
      const dunderServer = getStoreState().settings.dunderServer;
      const signMessageResult = await injections.lndMobile.wallet.signMessageNodePubkey(stringToUint8Array("REGISTER"));
      // const getInfoResponse = await injections.lndMobile.index.getInfo();
      const request: IOnDemandChannelRegisterRequest = {
        pubkey: getStoreState().lightning.nodeInfo?.identityPubkey!,
        signature: signMessageResult.signature,
        preimage: bytesToHexString(preimage),
        amountSat: amount,
      };

      actions.setRegisterInvoicePreimage(preimage);

      const result = await fetch(`${dunderServer}/ondemand-channel/register`, {
        body: JSON.stringify(request),
        method: "POST",
      });
      const json = await result.json();
      if (json.status === "ERROR") {
        throw new Error(json.reason);
      }
      return json;
    }),

    claim: thunk(async (_, _2, { getStoreState, injections }) => {
      log.i("claim");
      const dunderServer = getStoreState().settings.dunderServer;

      const signMessageResult = await injections.lndMobile.wallet.signMessageNodePubkey(stringToUint8Array("CLAIM"));

      const request = JSON.stringify({
        pubkey: getStoreState().lightning.nodeInfo?.identityPubkey,
        signature: signMessageResult.signature,
      });

      return (await fetch(`${dunderServer}/ondemand-channel/claim`, {
        body: request,
        method: "POST",
      })).json();
    }),

    setRegisterInvoicePreimage: action((store, payload) => {
      store.registerInvoicePreimage = payload;
    }),

    setStatus: action((store, payload) => {
      store.status = payload;
    }),

    registerInvoicePreimage: null,
    status: null,
    serviceActive: computed((store) => store.status?.status === true),
  },
};

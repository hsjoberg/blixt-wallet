import { NativeModules, DeviceEventEmitter } from "react-native";
import { sendCommand, sendStreamCommand, decodeStreamResult } from "./utils";
import { lnrpc, routerrpc, invoicesrpc } from "../../proto/proto";
import Long from "long";
import sha from "sha.js";
import { stringToUint8Array, hexToUint8Array } from "../utils";
import { TLV_RECORD_NAME } from "../utils/constants";
const { LndMobile } = NativeModules;

/**
 * @throws
 * TODO return values are terrible
 */
export const init = async (): Promise<{ data: string } | number> => {
  return await LndMobile.init();
};

export enum ELndMobileStatusCodes {
  STATUS_SERVICE_BOUND = 1,
  STATUS_PROCESS_STARTED = 2,
  STATUS_WALLET_UNLOCKED = 4,
}

export const checkStatus = async (): Promise<number> => {
  return await LndMobile.checkStatus();
};

/**
 * @throws
 * @return string
 */
export const writeConfigFile = async () => {
  return await LndMobile.writeConfigFile();
};

/**
 * @throws
 */
export const startLnd = async (torEnabled: boolean): Promise<string> => {
  return await LndMobile.startLnd(torEnabled);
};

/**
 * @throws
 */
export const connectPeer = async (pubkey: string, host: string): Promise<lnrpc.ConnectPeerResponse> => {
  return await sendCommand<lnrpc.IConnectPeerRequest, lnrpc.ConnectPeerRequest, lnrpc.ConnectPeerResponse>({
    request: lnrpc.ConnectPeerRequest,
    response: lnrpc.ConnectPeerResponse,
    method: "ConnectPeer",
    options: {
      addr: lnrpc.LightningAddress.create({
        host,
        pubkey,
      }),
    },
  });
};


/**
 * @throws
 */
export const getNodeInfo = async (pubKey: string): Promise<lnrpc.NodeInfo> => {
  const response = await sendCommand<lnrpc.INodeInfoRequest, lnrpc.NodeInfoRequest, lnrpc.NodeInfo>({
    request: lnrpc.NodeInfoRequest,
    response: lnrpc.NodeInfo,
    method: "GetNodeInfo",
    options: {
      pubKey,
    },
  });
  return response;
};

/**
 * @throws
 */
export const getInfo = async (): Promise<lnrpc.GetInfoResponse> => {
  const response = await sendCommand<lnrpc.IGetInfoRequest, lnrpc.GetInfoRequest, lnrpc.GetInfoResponse>({
    request: lnrpc.GetInfoRequest,
    response: lnrpc.GetInfoResponse,
    method: "GetInfo",
    options: {},
  });
  return response;
};

/**
 *
 * @throws
 * @param paymentRequest BOLT11-encoded payment request
 * @params name TLV record for sender name
 *
 */
export const sendPaymentSync = async (paymentRequest: string, amount?: Long, tlvRecordName?: string | null): Promise<lnrpc.SendResponse> => {
  const options: lnrpc.ISendRequest = {
    paymentRequest,
  };
  if (tlvRecordName && tlvRecordName.length > 0) {
    options.destCustomRecords = {
      [TLV_RECORD_NAME]: stringToUint8Array(tlvRecordName),
    }
  }
  if (amount) {
    options.amt = amount;
  }

  const response = await sendCommand<lnrpc.ISendRequest, lnrpc.SendRequest, lnrpc.SendResponse>({
    request: lnrpc.SendRequest,
    response: lnrpc.SendResponse,
    method: "SendPaymentSync",
    options,
  });
  return response;
};


export const sendPaymentV2Sync = (paymentRequest: string, amount?: Long, tlvRecordName?: string | null): Promise<lnrpc.Payment> => {
  const options: routerrpc.ISendPaymentRequest = {
    paymentRequest,
    noInflightUpdates: true,
    timeoutSeconds: 60,
    maxParts: 2,
    feeLimitMsat: Long.fromValue(50000),
    cltvLimit: 0,
  };
  if (tlvRecordName && tlvRecordName.length > 0) {
    options.destCustomRecords = {
      [TLV_RECORD_NAME]: stringToUint8Array(tlvRecordName),
    }
  }
  if (amount) {
    options.amt = amount;
  }

  return new Promise(async (resolve, reject) => {
    const listener = DeviceEventEmitter.addListener("RouterSendPaymentV2", (e) => {
      console.log(e);
      const response = decodeSendPaymentV2Result(e.data);
      console.log(response);

      resolve(response);
      listener.remove();
    });

    const response = await sendStreamCommand<routerrpc.ISendPaymentRequest, routerrpc.SendPaymentRequest>({
      request: routerrpc.SendPaymentRequest,
      method: "RouterSendPaymentV2",
      options,
    }, false);
  });
};

// TODO error handling
export const decodeSendPaymentV2Result = (data: string): lnrpc.Payment => {
  return decodeStreamResult<lnrpc.Payment>({
    response: lnrpc.Payment,
    base64Result: data,
  });
};


/**
 * @throws
 */
export const sendKeysendPaymentSync = async (destinationPubKey: Uint8Array, sat: Long, preImage: Uint8Array): Promise<lnrpc.SendResponse> => {
  const response = await sendCommand<lnrpc.ISendRequest, lnrpc.SendRequest, lnrpc.SendResponse>({
    request: lnrpc.SendRequest,
    response: lnrpc.SendResponse,
    method: "SendPaymentSync",
    options: {
      dest: destinationPubKey,
      amt: sat,
      paymentHash: sha("sha256").update(preImage).digest(),
      destCustomRecords: {
        // 5482373484 is the record for lnd
        // keysend payments as described in
        // https://github.com/lightningnetwork/lnd/releases/tag/v0.9.0-beta
        "5482373484": preImage,
      },
    },
  });
  return response;
};

/**
 * @throws
 */
export const addInvoice = async (amount: number, memo: string, expiry: number = 3600): Promise<lnrpc.AddInvoiceResponse> => {
  const response = await sendCommand<lnrpc.IInvoice, lnrpc.Invoice, lnrpc.AddInvoiceResponse>({
    request: lnrpc.Invoice,
    response: lnrpc.AddInvoiceResponse,
    method: "AddInvoice",
    options: {
      value: Long.fromValue(amount),
      memo,
      expiry: Long.fromValue(expiry),
      private: true,
    },
  });
  return response;
};

/**
 * @throws
 */
export const cancelInvoice = async (paymentHash: string): Promise<invoicesrpc.CancelInvoiceResp> => {
  const response = await sendCommand<invoicesrpc.ICancelInvoiceMsg, invoicesrpc.ICancelInvoiceMsg, invoicesrpc.CancelInvoiceResp>({
    request: invoicesrpc.CancelInvoiceMsg,
    response: invoicesrpc.CancelInvoiceResp,
    method: "InvoicesCancelInvoice",
    options: {
      paymentHash: hexToUint8Array(paymentHash),
    },
  });
  return response;
};

/**
 * @throws
 */
export const lookupInvoice = async (rHash: string): Promise<lnrpc.Invoice> => {
  const response = await sendCommand<lnrpc.IPaymentHash, lnrpc.PaymentHash, lnrpc.Invoice>({
    request: lnrpc.PaymentHash,
    response: lnrpc.Invoice,
    method: "LookupInvoice",
    options: {
      rHashStr: rHash,
    },
  });
  return response;
};

/**
 * @throws
 */
export const listPeers = async (): Promise<lnrpc.ListPeersResponse> => {
  const response = await sendCommand<lnrpc.IListPeersRequest, lnrpc.ListPeersRequest, lnrpc.ListPeersResponse>({
    request: lnrpc.ListPeersRequest,
    response: lnrpc.ListPeersResponse,
    method: "ListPeers",
    options: {},
  });
  return response;
};


/**
 * @throws
 */
export const queryRoutes = async (pubKey: string): Promise<lnrpc.QueryRoutesResponse> => {
  const response = await sendCommand<lnrpc.IQueryRoutesRequest, lnrpc.IQueryRoutesRequest, lnrpc.QueryRoutesResponse>({
    request: lnrpc.QueryRoutesRequest,
    response: lnrpc.QueryRoutesResponse,
    method: "QueryRoutes",
    options: {
      pubKey,
    },
  });
  return response;
};

/**
 * @throws
 */
export const decodePayReq = async (bolt11: string): Promise<lnrpc.PayReq> => {
  const response = await sendCommand<lnrpc.IPayReqString, lnrpc.PayReqString, lnrpc.PayReq>({
    request: lnrpc.PayReqString,
    response: lnrpc.PayReq,
    method: "DecodePayReq",
    options: {
      payReq: bolt11,
    },
  });
  return response;
};

export type IReadLndLogResponse = string[];
/**
 * @throws
 * TODO remove
 */
export const readLndLog = async (): Promise<IReadLndLogResponse> => {
  return [""];
};

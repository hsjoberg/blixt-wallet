import { NativeModules } from "react-native";
import { sendCommand } from "./utils";
import { lnrpc } from "../../proto/proto";
const { LndMobile } = NativeModules;

/**
 * @throws
 * TODO return values are terrible
 */
export const init = async (): Promise<{ data: string } | number> => {
  return await LndMobile.init();
};

export const checkStatus = async (): Promise<number> => {
  return await NativeModules.LndMobile.checkStatus();
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
export const startLnd = async (): Promise<string> => {
  return await NativeModules.LndMobile.startLnd();
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
 * @throws
 */
export const sendPaymentSync = async (paymentRequest: string): Promise<lnrpc.SendResponse> => {
  const response = await sendCommand<lnrpc.ISendRequest, lnrpc.SendRequest, lnrpc.SendResponse>({
    request: lnrpc.SendRequest,
    response: lnrpc.SendResponse,
    method: "SendPaymentSync",
    options: {
      paymentRequest,
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
      value: amount,
      memo,
      expiry,
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

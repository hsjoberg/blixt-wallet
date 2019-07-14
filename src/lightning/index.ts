import { NativeModules } from "react-native";
import { fixGrpcJsonResponse } from "./utils";
import { ITransaction } from "../storage/database/transaction";
export * from "./channel";
const { LndGrpc } = NativeModules;

/**
 * @throws
 */
export const connectPeer = async (pubkey: string, host: string): Promise<any> => {
  try {
    const responseString = await NativeModules.LndGrpc.connectPeer(pubkey, host);
    const response = fixGrpcJsonResponse(JSON.parse(responseString));
    return response;
  } catch (e) { throw JSON.parse(e.message); }
};

/**
 * @throws
 */
export const unlockWallet = async (password: string): Promise<any> => {
  try {
    const responseString = await LndGrpc.unlockWallet(password);
    const response = fixGrpcJsonResponse(JSON.parse(responseString));
    return response;
  } catch (e) { throw JSON.parse(e.message); }
};

export interface IGetInfoResponse {
  pubkey: string;
  syncedToChain: boolean;
}

/**
 * @throws
 */
export const getInfo = async (): Promise<IGetInfoResponse> => {
  try {
    const responseString = await LndGrpc.getInfo();
    const response = fixGrpcJsonResponse<IGetInfoResponse>(JSON.parse(responseString));
    return response;
  } catch (e) { throw JSON.parse(e.message); }
};

export interface IPaymentRouteHops {
  amtToForwardMsat: number;
  amtToForward: number;
  chanCapacity: number;
  chanId: number;
  expiry: number;
  feeMsat: number;
  fee: number;
  pubkey: string;
}

export interface ISendPaymentSyncResponse {
  paymentError: string;
  paymentHash: {
    bytes: number[];
    hash: number;
  };
  paymentPreImage: {
    bytes: number[];
    hash: number;
  };
  paymentRoute: {
    bitField0: number;
    hops: IPaymentRouteHops[]
  };
}


/**
 * @throws
 */
export const sendPaymentSync = async (paymentRequest: string): Promise<ISendPaymentSyncResponse> => {
  try {
    const responseString = await LndGrpc.sendPaymentSync(paymentRequest);
    const response = fixGrpcJsonResponse<ISendPaymentSyncResponse>(JSON.parse(responseString));
    return response;
  } catch (e) { throw JSON.parse(e.message); }
};


export interface IAddInvoiceResponse {
  paymentRequest: string;
  addIndex: number;
  rHash: any; // TODO
}
/**
 * @throws
 */
export const addInvoice = async (sat: number, memo: string, expiry: number = 3600): Promise<IAddInvoiceResponse> => {
  try {
    const responseString = await LndGrpc.addInvoice(sat, memo, expiry);
    const response = fixGrpcJsonResponse<IAddInvoiceResponse>(JSON.parse(responseString));
    return response;
  } catch (e) { throw JSON.parse(e.message); }
};

/**
 * @throws
 */
export const lookupInvoice = async (rHash: string): Promise<any> => {
  try {
    const responseString = await LndGrpc.lookupInvoice(rHash);
    const response = fixGrpcJsonResponse<any>(JSON.parse(responseString));
    return response;
  } catch (e) { throw JSON.parse(e.message); }
};


export interface IDecodePayReqResponse {
  cltvExpiry: number; // Presumably blocks
  descriptionHash: string;
  description: string;
  destination: string;
  expiry: number; // actual seconds (NOT a timestamp)
  fallbackAddr: string;
  numSatoshis: number;
  paymentHash: string;
  routeHints: any[]; // TODO
  timestamp: number;
}
/**
 * @throws
 */
export const decodePayReq = async (bolt11: string): Promise<IDecodePayReqResponse> => {
  try {
    const responseString = await LndGrpc.decodePayReq(bolt11);
    const response = fixGrpcJsonResponse<IDecodePayReqResponse>(JSON.parse(responseString));
    return response;
  } catch (e) { throw JSON.parse(e.message); }
};


export type IReadLndLogResponse = string[];
/**
 * @throws
 */
export const readLndLog = async (): Promise<IReadLndLogResponse> => {
  try {
    const responseString = await LndGrpc.readLndLog();
    console.log("responseString");
    console.log(responseString);
    const response = fixGrpcJsonResponse<IReadLndLogResponse>(JSON.parse(responseString));
    return response;
  } catch (e) { throw JSON.parse(e.message); }
};


/**
 * @throws
 */
export const sendCoins = async (): Promise<any> => {
  try {
    const responseString = await LndGrpc.sendCoins();
    const response = fixGrpcJsonResponse<any>(JSON.parse(responseString));
    return response;
  } catch (e) { throw JSON.parse(e.message); }
};


export interface INewAddressResponse {
  address: string;
}
/**
 * @throws
 */
export const newAddress = async (): Promise<INewAddressResponse> => {
  try {
    const responseString = await LndGrpc.newAddress();
    const response = fixGrpcJsonResponse<INewAddressResponse>(JSON.parse(responseString));
    return response;
  } catch (e) { throw JSON.parse(e.message); }
};

import { NativeModules } from "react-native";
import { fixGrpcJsonResponse, sendCommand } from "./utils";
import { ITransaction } from "../storage/database/transaction";
import { Buffer } from "buffer";

import { lnrpc } from "../../proto/proto";

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
export const unlockWallet = async (password: string): Promise<lnrpc.IUnlockWalletResponse> => {
  try {
    const response = await sendCommand<lnrpc.IUnlockWalletRequest, lnrpc.IUnlockWalletResponse>({
      request: lnrpc.UnlockWalletRequest,
      response: lnrpc.UnlockWalletResponse,
      method: "UnlockWallet",
      options: {
        walletPassword: Buffer.from(password, "utf8"),
      },
    });
    return response;

    // const request = lnrpc.UnlockWalletRequest.create({
    //   walletPassword: Buffer.from(password, "utf8"),
    // });
    // const response = await NativeModules.LndGrpc.sendCommand(
    //   "UnlockWallet",
    //   base64.fromByteArray(
    //     lnrpc.UnlockWalletRequest.encode(request).finish()
    //   )
    // );

    // const responseString = await LndGrpc.unlockWallet(password);
    // const response = fixGrpcJsonResponse(JSON.parse(responseString));
    // return response;
  } catch (e) { throw e.message; }
};

export interface IGetInfoResponse {
  identityPubkey: string;
  syncedToChain: boolean;
}

/**
 * @throws
 */
export const getInfo = async (): Promise<lnrpc.IGetInfoResponse> => {
  try {
    const response = await sendCommand<lnrpc.IGetInfoRequest, lnrpc.IGetInfoResponse>({
      request: lnrpc.GetInfoRequest,
      response: lnrpc.GetInfoResponse,
      method: "GetInfo",
      options: {},
    });
    return response;

    // const request = lnrpc.GetInfoRequest.create({});
    //
    // const responseB64 = await NativeModules.LndGrpc.sendCommand(
    //   "GetInfo",
    //   base64.fromByteArray(
    //     lnrpc.GetInfoRequest.encode(request).finish()
    //   )
    // );
    //
    // const response = lnrpc.GetInfoResponse.decode(base64.toByteArray(responseB64.data));
    // return response;

    // const responseString = await LndGrpc.getInfo();
    // const response = fixGrpcJsonResponse<IGetInfoResponse>(JSON.parse(responseString));
    // return response;
  } catch (e) { throw e.message; }
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
export const lookupInvoice = async (rHash: string): Promise<lnrpc.IInvoice> => {
  try {
    const response = await sendCommand<lnrpc.IPaymentHash, lnrpc.IInvoice>({
      request: lnrpc.PaymentHash,
      response: lnrpc.Invoice,
      method: "LookupInvoice",
      options: {
        rHashStr: rHash,
      },
    });
    return response;

    // const responseString = await LndGrpc.lookupInvoice(rHash);
    // const response = fixGrpcJsonResponse<any>(JSON.parse(responseString));
    // return response;
  } catch (e) { throw e.message; }
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

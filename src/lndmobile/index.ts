import { NativeModules } from "react-native";
import { fixGrpcJsonResponse, sendCommand } from "./utils";
import { ITransaction } from "../storage/database/transaction";
import { Buffer } from "buffer";

import { lnrpc } from "../../proto/proto";

export * from "./channel";
const { LndGrpc } = NativeModules;

/**
 * @throws
 * TODO test
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
export const unlockWallet = async (password: string): Promise<lnrpc.UnlockWalletResponse> => {
  const response = await sendCommand<lnrpc.IUnlockWalletRequest, lnrpc.UnlockWalletRequest, lnrpc.UnlockWalletResponse>({
    request: lnrpc.UnlockWalletRequest,
    response: lnrpc.UnlockWalletResponse,
    method: "UnlockWallet",
    options: {
      walletPassword: Buffer.from(password, "utf8"),
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

/**
 * @throws
 * TODO test
 */
export const sendCoins = async (address: string, sat: number): Promise<lnrpc.SendCoinsResponse> => {
  const response = await sendCommand<lnrpc.ISendCoinsRequest, lnrpc.SendCoinsRequest, lnrpc.SendCoinsResponse>({
    request: lnrpc.SendCoinsRequest,
    response: lnrpc.SendCoinsResponse,
    method: "SendCoins",
    options: {
      addr: address,
      amount: sat,
    },
  });
  return response;
};

/**
 * @throws
 */
export const newAddress = async (): Promise<lnrpc.NewAddressResponse> => {
  const response = await sendCommand<lnrpc.INewAddressRequest, lnrpc.NewAddressRequest, lnrpc.NewAddressResponse>({
    request: lnrpc.NewAddressRequest,
    response: lnrpc.NewAddressResponse,
    method: "NewAddress",
    options: {
      type: lnrpc.AddressType.WITNESS_PUBKEY_HASH,
    },
  });
  return response;
};

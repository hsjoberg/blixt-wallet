import { lnrpc } from "../../proto/proto";
import { timeout } from "./utils";

export enum ELndMobileStatusCodes {
  STATUS_SERVICE_BOUND = 1,
  STATUS_PROCESS_STARTED = 2,
  STATUS_WALLET_UNLOCKED = 4,
}

let LndMobileStatus = 0;

export const init = jest.fn(async (): Promise<{ data: string } | number> => {
  await timeout(10);
  LndMobileStatus += ELndMobileStatusCodes.STATUS_SERVICE_BOUND; // TODO figure out bitmasking...
  return { data: "" };
});

export const checkStatus = jest.fn(async (): Promise<number> => {
  return LndMobileStatus;
});

export const writeConfigFile = jest.fn(async () => {
  return "File written:";
});

export const startLnd = jest.fn(async (): Promise<string> => {
  await timeout(1000);
  return "started";
});

// export const connectPeer = async (pubkey: string, host: string): Promise<lnrpc.ConnectPeerResponse> => {
//   return await sendCommand<lnrpc.IConnectPeerRequest, lnrpc.ConnectPeerRequest, lnrpc.ConnectPeerResponse>({
//     request: lnrpc.ConnectPeerRequest,
//     response: lnrpc.ConnectPeerResponse,
//     method: "ConnectPeer",
//     options: {
//       addr: lnrpc.LightningAddress.create({
//         host,
//         pubkey,
//       }),
//     },
//   });
// };
//
// export const getNodeInfo = async (pubKey: string): Promise<lnrpc.NodeInfo> => {
//   const response = await sendCommand<lnrpc.INodeInfoRequest, lnrpc.NodeInfoRequest, lnrpc.NodeInfo>({
//     request: lnrpc.NodeInfoRequest,
//     response: lnrpc.NodeInfo,
//     method: "GetNodeInfo",
//     options: {
//       pubKey,
//     },
//   });
//   return response;
// };

export const getInfo = jest.fn(async (): Promise<lnrpc.GetInfoResponse> => {
  const response = lnrpc.GetInfoResponse.create({
    uris: [],
    chains: [{
      chain: 'bitcoin', network: 'testnet'
    }],
    identityPubkey: '02b5380da0919e32b13c1a21c1c85000eed0ba9a9309fc6849d72230d43088ae1d',
    alias: '02b5380da0919e32b13c',
    numPeers: 3,
    blockHeight: 1572555,
    blockHash: '000000000000006cb43faa5c615e45419f48e9d94d77c1bab8a28018cf2db6ef',
    syncedToChain: true,
    testnet: true,
    bestHeaderTimestamp: 1564940232,
    version: '0.7.1-beta commit=v0.7.1-beta-rc1-10-g3760f29f5e758b2865b756604333ca22cf23e90b'
  });
  return response;
});

// export const sendPaymentSync = async (paymentRequest: string): Promise<lnrpc.SendResponse> => {
//   const response = await sendCommand<lnrpc.ISendRequest, lnrpc.SendRequest, lnrpc.SendResponse>({
//     request: lnrpc.SendRequest,
//     response: lnrpc.SendResponse,
//     method: "SendPaymentSync",
//     options: {
//       paymentRequest,
//     },
//   });
//   return response;
// };
//
//
// export const addInvoice = async (amount: number, memo: string, expiry: number = 3600): Promise<lnrpc.AddInvoiceResponse> => {
//   const response = await sendCommand<lnrpc.IInvoice, lnrpc.Invoice, lnrpc.AddInvoiceResponse>({
//     request: lnrpc.Invoice,
//     response: lnrpc.AddInvoiceResponse,
//     method: "AddInvoice",
//     options: {
//       value: amount,
//       memo,
//       expiry,
//     },
//   });
//   return response;
// };
//
// export const lookupInvoice = async (rHash: string): Promise<lnrpc.Invoice> => {
//   const response = await sendCommand<lnrpc.IPaymentHash, lnrpc.PaymentHash, lnrpc.Invoice>({
//     request: lnrpc.PaymentHash,
//     response: lnrpc.Invoice,
//     method: "LookupInvoice",
//     options: {
//       rHashStr: rHash,
//     },
//   });
//   return response;
// };
//
// export const decodePayReq = async (bolt11: string): Promise<lnrpc.PayReq> => {
//   const response = await sendCommand<lnrpc.IPayReqString, lnrpc.PayReqString, lnrpc.PayReq>({
//     request: lnrpc.PayReqString,
//     response: lnrpc.PayReq,
//     method: "DecodePayReq",
//     options: {
//       payReq: bolt11,
//     },
//   });
//   return response;
// };
//
// export type IReadLndLogResponse = string[];
//
// export const readLndLog = async (): Promise<IReadLndLogResponse> => {
//   return [""];
// };

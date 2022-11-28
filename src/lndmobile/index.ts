import { NativeModules } from "react-native";
import { sendCommand, sendStreamCommand, decodeStreamResult } from "./utils";
import { lnrpc, routerrpc, invoicesrpc } from "../../proto/lightning";
import Long from "long";
import sha from "sha.js";
import { stringToUint8Array, hexToUint8Array, unicodeStringToUint8Array } from "../utils";
import { TLV_KEYSEND, TLV_RECORD_NAME, TLV_WHATSAT_MESSAGE } from "../utils/constants";
import { checkLndStreamErrorResponse } from "../utils/lndmobile";
import { LndMobileEventEmitter } from "../utils/event-listener";
import { getChanInfo, listPrivateChannels } from "./channel";
const { LndMobile, LndMobileTools } = NativeModules;

/**
 * @throws
 */
export const initialize = async (): Promise<{ data: string } | number> => {
  return await LndMobile.initialize();
};

export enum ELndMobileStatusCodes {
  STATUS_SERVICE_BOUND = 1,
  STATUS_PROCESS_STARTED = 2,
  STATUS_WALLET_UNLOCKED = 4,
}

export const checkStatus = async (): Promise<ELndMobileStatusCodes> => {
  return await LndMobile.checkStatus();
};

/**
 * @throws
 * @return string
 */
export const writeConfig = async (data: string) => {
  return await LndMobileTools.writeConfig(data);
};

/**
 * @throws
 * @return string
 */
export const writeConfigFile = async () => {
  return await LndMobileTools.writeConfigFile();
};

export const subscribeState = async () => {
  const response = await sendStreamCommand<lnrpc.ISubscribeStateRequest, lnrpc.SubscribeStateRequest>({
    request: lnrpc.SubscribeStateRequest,
    method: "SubscribeState",
    options: {},
  }, false);
  return response;
}

export const decodeState = (data: string): lnrpc.SubscribeStateResponse => {
  return decodeStreamResult<lnrpc.SubscribeStateResponse>({
    response: lnrpc.SubscribeStateResponse,
    base64Result: data,
  });
};

/**
 * @throws
 */
export const startLnd = async (torEnabled: boolean, args?: string): Promise<{data:string}> => {
  return await LndMobile.startLnd(torEnabled, args);
};

export const checkICloudEnabled = async (): Promise<boolean> => {
  return await LndMobileTools.checkICloudEnabled();
};

/**
 * @throws
 */
export const checkApplicationSupportExists = async () => {
  return await LndMobileTools.checkApplicationSupportExists();
};

/**
 * @throws
 */
export const checkLndFolderExists = async () => {
  return await LndMobileTools.checkLndFolderExists();
};

/**
 * @throws
 */
export const createIOSApplicationSupportAndLndDirectories = async () => {
  return await LndMobileTools.createIOSApplicationSupportAndLndDirectories();
};

/**
 * @throws
 */
export const TEMP_moveLndToApplicationSupport = async () => {
  return await LndMobileTools.TEMP_moveLndToApplicationSupport();
};

/**
 * @throws
 */
export const excludeLndICloudBackup = async () => {
  return await LndMobileTools.excludeLndICloudBackup();
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
export const disconnectPeer = async (pubKey: string): Promise<lnrpc.DisconnectPeerResponse> => {
  const response = await sendCommand<lnrpc.IDisconnectPeerRequest, lnrpc.DisconnectPeerRequest, lnrpc.DisconnectPeerResponse>({
    request: lnrpc.DisconnectPeerRequest,
    response: lnrpc.DisconnectPeerResponse,
    method: "DisconnectPeer",
    options: {
      pubKey,
    },
  });
  return response;
};

/**
 * @throws
 */
export const getNodeInfo = async (pubKey: string, includeChannels: boolean = false): Promise<lnrpc.NodeInfo> => {
  const response = await sendCommand<lnrpc.INodeInfoRequest, lnrpc.NodeInfoRequest, lnrpc.NodeInfo>({
    request: lnrpc.NodeInfoRequest,
    response: lnrpc.NodeInfo,
    method: "GetNodeInfo",
    options: {
      pubKey,
      includeChannels,
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
      [TLV_RECORD_NAME]: unicodeStringToUint8Array(tlvRecordName),
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


export const sendPaymentV2Sync = (paymentRequest: string, amount?: Long, payAmount: Long, tlvRecordName?: string | null, multiPath?: boolean): Promise<lnrpc.Payment> => {
  const options: routerrpc.ISendPaymentRequest = {
    paymentRequest,
    noInflightUpdates: true,
    timeoutSeconds: 60,
    maxParts: multiPath ? 16 : 1,
    feeLimitSat: Long.fromValue(Math.max(10, payAmount * 0.02)),
    cltvLimit: 0,
  };
  if (amount) {
    options.amt = amount;
  }
  if (tlvRecordName && tlvRecordName.length > 0) {
    options.destCustomRecords = {
      [TLV_RECORD_NAME]: unicodeStringToUint8Array(tlvRecordName),
    }
  }

  return new Promise(async (resolve, reject) => {
    const listener = LndMobileEventEmitter.addListener("RouterSendPaymentV2", (e) => {
      try {
        listener.remove();
        const error = checkLndStreamErrorResponse("RouterSendPaymentV2", e);
        if (error === "EOF") {
          return;
        } else if (error) {
          console.log("Got error from RouterSendPaymentV2", [error]);
          return reject(error);
        }

        const response = decodeSendPaymentV2Result(e.data);
        resolve(response);
      } catch (error) {
        reject(error.message);
      }
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


export const sendKeysendPaymentV2 = (destinationPubKey: string, sat: Long, preImage: Uint8Array, routeHints: lnrpc.IRouteHint[], tlvRecordNameStr: string, tlvRecordWhatSatMessageStr: string): Promise<lnrpc.Payment> => {
  const options: routerrpc.ISendPaymentRequest = {
    dest: hexToUint8Array(destinationPubKey),
    amt: sat,
    routeHints,
    paymentHash: sha("sha256").update(preImage).digest(),
    destFeatures: [lnrpc.FeatureBit.TLV_ONION_REQ],
    destCustomRecords: {
      // 5482373484 is the record for lnd
      // keysend payments as described in
      // https://github.com/lightningnetwork/lnd/releases/tag/v0.9.0-beta
      [TLV_KEYSEND]: preImage,
    },

    noInflightUpdates: true,
    timeoutSeconds: 60,
    maxParts: 2,
    feeLimitSat: Long.fromValue(Math.max(10, sat?.mul(0.02).toNumber() ?? 0)),
    cltvLimit: 0,
  };
  if (tlvRecordNameStr && tlvRecordNameStr.length > 0) {
    options.destCustomRecords![TLV_RECORD_NAME] = unicodeStringToUint8Array(tlvRecordNameStr);
  }
  if (tlvRecordWhatSatMessageStr && tlvRecordWhatSatMessageStr.length > 0) {
    options.destCustomRecords![TLV_WHATSAT_MESSAGE] = unicodeStringToUint8Array(tlvRecordWhatSatMessageStr);
  }

  return new Promise(async (resolve, reject) => {
    const listener = LndMobileEventEmitter.addListener("RouterSendPaymentV2", (e) => {
      console.log(e);
      const error = checkLndStreamErrorResponse("RouterSendPaymentV2", e);
      if (error === "EOF") {
        return;
      } else if (error) {
        console.log("Got error from RouterSendPaymentV2", [error]);
        return reject(error);
      }

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
    console.log(response);
  });
};

export const sendKeysendPayment = async (destinationPubKey: string, sat: Long, preImage: Uint8Array, routeHints: lnrpc.IRouteHint[], tlvRecordNameStr: string): Promise<lnrpc.SendResponse> => {
  try {
    const responseQueryRoutes = await sendCommand<lnrpc.IQueryRoutesRequest, lnrpc.QueryRoutesRequest, lnrpc.QueryRoutesResponse>({
      request: lnrpc.QueryRoutesRequest,
      response: lnrpc.QueryRoutesResponse,
      method: "QueryRoutes",
      options: {
        pubKey: destinationPubKey,
        amt: sat,
        routeHints,
        destCustomRecords: {
          // Custom records are injected in a hacky way below
          // because of a bug in protobufjs

          // [TLV_RECORD_NAME]: stringToUint8Array(tlvRecordNameStr),
          // 5482373484 is the record for lnd
          // keysend payments as described in
          // https://github.com/lightningnetwork/lnd/releases/tag/v0.9.0-beta
          // "5482373484": preImage,
        },
        destFeatures: [lnrpc.FeatureBit.TLV_ONION_REQ],
      },
    });

    console.log("responseQueryRoutes", responseQueryRoutes);

    for (const route of responseQueryRoutes.routes) {
      try {
        const lastHop = route.hops!.length - 1;

        route.hops![lastHop].customRecords!["5482373484"] =  preImage;
        if (tlvRecordNameStr && tlvRecordNameStr.length > 0) {
          route.hops![lastHop].customRecords![TLV_RECORD_NAME] = stringToUint8Array(tlvRecordNameStr);
        }

        const response = await sendCommand<lnrpc.ISendToRouteRequest, lnrpc.SendToRouteRequest, lnrpc.SendResponse>({
          request: lnrpc.SendToRouteRequest,
          response: lnrpc.SendResponse,
          method: "SendToRouteSync",
          options: {
            paymentHash: sha("sha256").update(preImage).digest(),
            route,
          },
        });
        return response;
      } catch (e) {
        console.log(e);
      }
    }
  } catch (e) {
    console.log("QueryRoutes Error", e.message);
  }
  return null;
};

// TODO error handling
export const decodePaymentStatus = (data: string): routerrpc.PaymentStatus => {
  return decodeStreamResult<routerrpc.PaymentStatus>({
    response: routerrpc.PaymentStatus,
    base64Result: data,
  });
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

export const getRouteHints = async (max: number = 5): Promise<lnrpc.IRouteHint[]> => {
  const routeHints: lnrpc.IRouteHint[] = [];
  const channels = await listPrivateChannels();

  // Follows the code in `addInvoice()` of the lnd project
  for (const channel of channels.channels) {
    const chanInfo = await getChanInfo(channel.chanId!);
    const remotePubkey = channel.remotePubkey;

    // TODO check if node is publicly
    // advertised in the network graph
    // https://github.com/lightningnetwork/lnd/blob/38b521d87d3fd9cff628e5dc09b764aeabaf011a/channeldb/graph.go#L2141

    let policy: lnrpc.IRoutingPolicy;
    if (remotePubkey === chanInfo.node1Pub) {
      policy = chanInfo.node1Policy!;
    }
    else {
      policy = chanInfo.node2Policy!;
    }

    if (!policy) {
      continue;
    }

    routeHints.push(lnrpc.RouteHint.create({
      hopHints: [{
        nodeId: remotePubkey,
        chanId: chanInfo.channelId,
        feeBaseMsat: policy.feeBaseMsat ? policy.feeBaseMsat.toNumber() : undefined,
        feeProportionalMillionths: policy.feeRateMilliMsat ? policy.feeRateMilliMsat.toNumber() : undefined,
        cltvExpiryDelta: policy.timeLockDelta,
      }]
    }));
  }

  console.log("our hints", routeHints);
  return routeHints;
}

export interface IAddInvoiceBlixtLspArgs {
  amount: number;
  memo: string;
  expiry?: number;

  servicePubkey: string;
  chanId: string;
  cltvExpiryDelta: number;
  feeBaseMsat: number;
  feeProportionalMillionths: number;

  preimage: Uint8Array;
}
/**
 * @throws
 */
export const addInvoiceBlixtLsp = async ({amount, memo, expiry = 600, servicePubkey, chanId, cltvExpiryDelta, feeBaseMsat, feeProportionalMillionths, preimage}: IAddInvoiceBlixtLspArgs): Promise<lnrpc.AddInvoiceResponse> => {
  const response = await sendCommand<lnrpc.IInvoice, lnrpc.Invoice, lnrpc.AddInvoiceResponse>({
    request: lnrpc.Invoice,
    response: lnrpc.AddInvoiceResponse,
    method: "AddInvoice",
    options: {
      rPreimage: preimage,
      value: Long.fromValue(amount),
      memo,
      expiry: Long.fromValue(expiry),
      // private: true,
      routeHints: [{hopHints: [{
        nodeId: servicePubkey,
        chanId: Long.fromString(chanId),
        cltvExpiryDelta,
        feeBaseMsat,
        feeProportionalMillionths,
      }]}],
    },
  });
  return response;
};

/**
 * @throws
 */
export const cancelInvoice = async (paymentHash: string): Promise<invoicesrpc.CancelInvoiceResp> => {
  const response = await sendCommand<invoicesrpc.ICancelInvoiceMsg, invoicesrpc.CancelInvoiceMsg, invoicesrpc.CancelInvoiceResp>({
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

/**
 * @throws
 */
export const describeGraph = async (): Promise<lnrpc.ChannelGraph> => {
  const response = await sendCommand<lnrpc.IChannelGraphRequest, lnrpc.ChannelGraphRequest, lnrpc.ChannelGraph>({
    request: lnrpc.ChannelGraphRequest,
    response: lnrpc.ChannelGraph,
    method: "DescribeGraph",
    options: {},
  });
  return response;
};

/**
 * @throws
 */
export const getRecoveryInfo = async (): Promise<lnrpc.GetRecoveryInfoResponse> => {
  const response = await sendCommand<lnrpc.IGetRecoveryInfoRequest, lnrpc.GetRecoveryInfoRequest, lnrpc.GetRecoveryInfoResponse>({
    request: lnrpc.GetRecoveryInfoRequest,
    response: lnrpc.GetRecoveryInfoResponse,
    method: "GetRecoveryInfo",
    options: {},
  });
  return response;
};

/**
 * @throws
 */
 export const listUnspent = async (): Promise<lnrpc.ListUnspentResponse> => {
  const response = await sendCommand<lnrpc.IListUnspentRequest, lnrpc.ListUnspentRequest, lnrpc.ListUnspentResponse>({
    request: lnrpc.ListUnspentRequest,
    response: lnrpc.ListUnspentResponse,
    method: "WalletKitListUnspent",
    options: {},
  });
  return response;
};

/**
 * @throws
 */
 export const resetMissionControl = async (): Promise<routerrpc.ResetMissionControlResponse> => {
  const response = await sendCommand<routerrpc.IResetMissionControlRequest, routerrpc.ResetMissionControlRequest, routerrpc.ResetMissionControlResponse>({
    request: routerrpc.ResetMissionControlRequest,
    response: routerrpc.ResetMissionControlResponse,
    method: "RouterResetMissionControl",
    options: {},
  });
  return response;
};
/**
 * @throws
 */
 export const getNetworkInfo = async (): Promise<lnrpc.NetworkInfo> => {
  const response = await sendCommand<lnrpc.INetworkInfoRequest, lnrpc.NetworkInfoRequest, lnrpc.NetworkInfo>({
    request: lnrpc.NetworkInfoRequest,
    response: lnrpc.NetworkInfo,
    method: "GetNetworkInfo",
    options: {},
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

import { NativeModules } from "react-native";
import { fixGrpcJsonResponse, sendCommand } from "./utils";

import { lnrpc } from "../../proto/proto";

const { LndGrpc } = NativeModules;

/**
 * @throws
 */
export const openChannel = async (pubkey: string, amount: number): Promise<any> => {
  try {
    const responseString = await NativeModules.LndGrpc.openChannel(pubkey, amount);
    const response = fixGrpcJsonResponse<any>(JSON.parse(responseString));
    return response;
  } catch (e) { throw JSON.parse(e.message); }
};

/**
 * @throws
 */
export const closeChannel = async (fundingTx: string, outputIndex: number): Promise<any> => {
  try {
    const responseString = await NativeModules.LndGrpc.closeChannel(fundingTx, outputIndex);
    const response = fixGrpcJsonResponse<any>(JSON.parse(responseString));
    return response;
  } catch (e) { throw JSON.parse(e.message); }
};

export interface IPendingChannel {
  channel: {
    capacity: number;
    channelPoint: string;
    localBalance: number;
    remoteBalance: number;
    remoteNodePub: string;
  };
  commitFee: number;
  commitWeight: number;
  confirmationHeight: number;
  feePerKw: number;
}

interface IPendingChannelsResponse {
  totalLimboBalance: number;
  pendingOpenChannels: IPendingChannel[];
  pendingClosingChannels: any[];
  pendingForceClosingChannels: any[];
  waitingCloseChannels: any[];
}

/**
 * @throws
 */
export const pendingChannels = async (): Promise<lnrpc.IPendingChannelsResponse> => {
  try {
    const response = await sendCommand<lnrpc.IPendingChannelsRequest, lnrpc.IPendingChannelsResponse>({
      request: lnrpc.PendingChannelsRequest,
      response: lnrpc.PendingChannelsResponse,
      method: "PendingChannels",
      options: {},
    });
    return response;

    // const responseString = await LndGrpc.pendingChannels();
    // const response = fixGrpcJsonResponse<IPendingChannelsResponse>(JSON.parse(responseString));
    // return response;
  } catch (e) { throw e.message; }
};


export interface IChannel {
  active: boolean;
  bitField0: number;
  capacity: number;
  chanId: number;
  chanStatusFlags: string;
  channelPoint: string;
  commitFee: number;
  commitWeight: number;
  csvDelay: number;
  feePerKw: number;
  initiator: true;
  localBalance: number;
  numUpdates: number;
  pendingHtlcs: any[]; // TODO
  private: boolean;
  remoteBalance: number;
  remotePubkey: string;
  totalSatoshisReceived: number;
  totalSatoshisSent: number;
  unsettledBalance: number;
}

export interface IListChannelsResponse {
  channels: IChannel[];
}

/**
 * @throws
 */
export const listChannels = async (): Promise<lnrpc.IListChannelsResponse> => {
  try {
    const response = await sendCommand<lnrpc.IListChannelsRequest, lnrpc.IListChannelsResponse>({
      request: lnrpc.ListChannelsRequest,
      response: lnrpc.ListChannelsResponse,
      method: "ListChannels",
      options: {},
    });
    return response;

    // const responseString = await LndGrpc.listChannels();
    // const response = fixGrpcJsonResponse<IListChannelsResponse>(JSON.parse(responseString));
    // return response;
  } catch (e) { throw e.message; }
};

export interface IChannelBalanceResponse {
  balance: number;
  pendingOpenBalance: number;
}

/**
 * @throws
 */
export const channelBalance = async (): Promise<lnrpc.IChannelBalanceResponse> => {
  try {
    const response = await sendCommand<lnrpc.IChannelBalanceRequest, lnrpc.IChannelBalanceResponse>({
      request: lnrpc.ChannelBalanceRequest,
      response: lnrpc.ChannelBalanceResponse,
      method: "ChannelBalance",
      options: {},
    });
    return response;

    // const responseString = await LndGrpc.channelBalance();
    // const response = fixGrpcJsonResponse<IChannelBalanceResponse>(JSON.parse(responseString));
    // return response;
  } catch (e) { throw e.message; }
};

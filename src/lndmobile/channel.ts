import { sendCommand, sendStreamCommand, decodeStreamResult } from "./utils";
import { lnrpc } from "../../proto/lightning";
import Long from "long";
import * as base64 from "base64-js";

/**
 * @throws
 */
export const openChannel = async (pubkey: string, amount: number, privateChannel: boolean, feeRateSat?: number): Promise<lnrpc.ChannelPoint> => {
  const response = await sendCommand<lnrpc.IOpenChannelRequest, lnrpc.OpenChannelRequest, lnrpc.ChannelPoint>({
    request: lnrpc.OpenChannelRequest,
    response: lnrpc.ChannelPoint,
    method: "OpenChannelSync",
    options: {
      nodePubkeyString: pubkey,
      localFundingAmount: Long.fromValue(amount),
      targetConf: feeRateSat ? undefined : 2,
      private: privateChannel,
      satPerByte: feeRateSat ? Long.fromValue(feeRateSat) : undefined,
      scidAlias: true,
    },
  });
  return response;
};

/**
 * @throws
 * TODO implement
 */
export const closeChannel = async (fundingTxId: string, outputIndex: number, force: boolean): Promise<string> => {
  const response = await sendStreamCommand<lnrpc.ICloseChannelRequest, lnrpc.CloseChannelRequest>({
    request: lnrpc.CloseChannelRequest,
    method: "CloseChannel",
    options: {
      channelPoint: {
        fundingTxidStr: fundingTxId,
        outputIndex,
      },
      force,
    },
  }, false);
  return response;
};

/**
 * @throws
 * TODO implement
 */
export const abandonChannel = async (fundingTxId: string, outputIndex: number): Promise<lnrpc.AbandonChannelResponse> => {
  const response = await sendCommand<lnrpc.IAbandonChannelRequest, lnrpc.AbandonChannelRequest, lnrpc.AbandonChannelResponse>({
    request: lnrpc.AbandonChannelRequest,
    response: lnrpc.AbandonChannelResponse,
    method: "AbandonChannel",
    options: {
      channelPoint: {
        fundingTxidStr: fundingTxId,
        outputIndex,
      }
    },
  });
  return response;
};
/**
 * @throws
 */
export const pendingChannels = async (): Promise<lnrpc.PendingChannelsResponse> => {
  const response = await sendCommand<lnrpc.IPendingChannelsRequest, lnrpc.PendingChannelsRequest, lnrpc.PendingChannelsResponse>({
    request: lnrpc.PendingChannelsRequest,
    response: lnrpc.PendingChannelsResponse,
    method: "PendingChannels",
    options: {},
  });
  return response;
};

/**
 * @throws
 */
export const listChannels = async (): Promise<lnrpc.ListChannelsResponse> => {
  const response = await sendCommand<lnrpc.IListChannelsRequest, lnrpc.ListChannelsRequest, lnrpc.ListChannelsResponse>({
    request: lnrpc.ListChannelsRequest,
    response: lnrpc.ListChannelsResponse,
    method: "ListChannels",
    options: {},
  });
  return response;
};

/**
 * @throws
 */
export const listPrivateChannels = async (): Promise<lnrpc.ListChannelsResponse> => {
  const response = await sendCommand<lnrpc.IListChannelsRequest, lnrpc.ListChannelsRequest, lnrpc.ListChannelsResponse>({
    request: lnrpc.ListChannelsRequest,
    response: lnrpc.ListChannelsResponse,
    method: "ListChannels",
    options: {
      privateOnly: true,
    },
  });
  return response;
};

/**
 * @throws
 */
export const channelBalance = async (): Promise<lnrpc.ChannelBalanceResponse> => {
  const response = await sendCommand<lnrpc.IChannelBalanceRequest, lnrpc.ChannelBalanceRequest, lnrpc.ChannelBalanceResponse>({
    request: lnrpc.ChannelBalanceRequest,
    response: lnrpc.ChannelBalanceResponse,
    method: "ChannelBalance",
    options: {},
  });
  return response;
};

/**
 * @throws
 */
export const subscribeChannelEvents = async (): Promise<string> => {
  const response = await sendStreamCommand<lnrpc.IChannelEventSubscription, lnrpc.ChannelEventSubscription>({
    request: lnrpc.ChannelEventSubscription,
    method: "SubscribeChannelEvents",
    options: {},
  }, false);
  return response;
};

/**
 * @throws
 */
export const exportAllChannelBackups = async (): Promise<lnrpc.ChanBackupSnapshot> => {
  const response = await sendCommand<lnrpc.IChanBackupExportRequest, lnrpc.ChanBackupExportRequest, lnrpc.ChanBackupSnapshot>({
    request: lnrpc.ChanBackupExportRequest,
    response: lnrpc.ChanBackupSnapshot,
    method: "ExportAllChannelBackups",
    options: {},
  });
  return response;
};

/**
 * @throws
 */
export const verifyChanBackup = async (channelsBackupBase64: string): Promise<lnrpc.VerifyChanBackupResponse> => {
  const response = await sendCommand<lnrpc.IChanBackupSnapshot, lnrpc.ChanBackupSnapshot, lnrpc.VerifyChanBackupResponse>({
    request: lnrpc.ChanBackupSnapshot,
    response: lnrpc.VerifyChanBackupResponse,
    method: "VerifyChanBackup",
    options: {
      multiChanBackup: {
        multiChanBackup: base64.toByteArray(channelsBackupBase64),
      },
    },
  });
  return response;
};

/**
 * @throws
 */
export const getChanInfo = async (chanId: Long): Promise<lnrpc.ChannelEdge> => {
  const response = await sendCommand<lnrpc.IChanInfoRequest, lnrpc.ChanInfoRequest, lnrpc.ChannelEdge>({
    request: lnrpc.ChanInfoRequest,
    response: lnrpc.ChannelEdge,
    method: "GetChanInfo",
    options: {
      chanId,
    },
  });
  return response;
};



// TODO error handling
export const decodeChannelEvent = (data: string): lnrpc.ChannelEventUpdate => {
  return decodeStreamResult<lnrpc.ChannelEventUpdate>({
    response: lnrpc.ChannelEventUpdate,
    base64Result: data,
  });
};

import { sendCommand, sendStreamCommand } from "./utils";
import { lnrpc } from "../../proto/proto";
import Long from "long";

/**
 * @throws
 */
export const openChannel = async (pubkey: string, amount: number): Promise<lnrpc.ChannelPoint> => {
  const response = await sendCommand<lnrpc.IOpenChannelRequest, lnrpc.OpenChannelRequest, lnrpc.ChannelPoint>({
    request: lnrpc.OpenChannelRequest,
    response: lnrpc.ChannelPoint,
    method: "OpenChannelSync",
    options: {
      nodePubkeyString: pubkey,
      localFundingAmount: Long.fromValue(amount),
      minConfs: 1,
    },
  });
  return response;
};

/**
 * @throws
 * TODO implement
 */
export const closeChannel = async (fundingTxId: string, outputIndex: number): Promise<string> => {
  const response = await sendStreamCommand<lnrpc.ICloseChannelRequest, lnrpc.CloseChannelRequest>({
    request: lnrpc.CloseChannelRequest,
    method: "CloseChannel",
    options: {
      channelPoint: {
        fundingTxidStr: fundingTxId,
        outputIndex,
      },
    },
  }, true);
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
  }, true);
  return response;
};

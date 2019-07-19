import { sendCommand } from "./utils";
import { lnrpc } from "../../proto/proto";

/**
 * @throws
 * TODO test
 */
export const openChannel = async (pubkey: string, amount: number): Promise<lnrpc.ChannelPoint> => {
  const response = await sendCommand<lnrpc.IOpenChannelRequest, lnrpc.OpenChannelRequest, lnrpc.ChannelPoint>({
    request: lnrpc.OpenChannelRequest,
    response: lnrpc.ChannelPoint,
    method: "OpenChannelSync",
    options: {
      nodePubkeyString: pubkey,
      localFundingAmount: amount,
      minConfs: 1,
    },
  });

  return response;
};

/**
 * @throws
 * TODO implement
 * TODO test
 */
export const closeChannel = async (fundingTx: string, outputIndex: number): Promise<any> => {
  try {
    // const responseString = await NativeModules.LndGrpc.closeChannel(fundingTx, outputIndex);
    // const response = fixGrpcJsonResponse<any>(JSON.parse(responseString));
    // return response;
    return 1;
  } catch (e) { throw JSON.parse(e.message); }
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

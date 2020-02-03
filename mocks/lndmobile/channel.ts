import { lnrpc } from "../../proto/proto";

// export const openChannel = async (pubkey: string, amount: number): Promise<lnrpc.ChannelPoint> => {
//   const response = await sendCommand<lnrpc.IOpenChannelRequest, lnrpc.OpenChannelRequest, lnrpc.ChannelPoint>({
//     request: lnrpc.OpenChannelRequest,
//     response: lnrpc.ChannelPoint,
//     method: "OpenChannelSync",
//     options: {
//       nodePubkeyString: pubkey,
//       localFundingAmount: amount,
//       minConfs: 1,
//     },
//   });
//
//   return response;
// };
//
// export const closeChannel = async (fundingTxId: string, outputIndex: number): Promise<string> => {
//   const response = await sendStreamCommand<lnrpc.ICloseChannelRequest, lnrpc.CloseChannelRequest>({
//     request: lnrpc.CloseChannelRequest,
//     method: "CloseChannel",
//     options: {
//       channelPoint: {
//         fundingTxidStr: fundingTxId,
//         outputIndex,
//       },
//     },
//   });
//   return response;
// };

export const pendingChannels = jest.fn(async (): Promise<lnrpc.PendingChannelsResponse> => {
  const response = lnrpc.PendingChannelsResponse.create({
    pendingClosingChannels: [],
    pendingForceClosingChannels: [],
    pendingOpenChannels: [],
    waitingCloseChannels: [],
    totalLimboBalance: 0,
  });
  return response;
});

export const listChannels = jest.fn(async (): Promise<lnrpc.ListChannelsResponse> => {
  const response = lnrpc.ListChannelsResponse.create({
    channels: [], // TODO
  });
  return response;
});

export const channelBalance = jest.fn(async (): Promise<lnrpc.ChannelBalanceResponse> => {
  const response = lnrpc.ChannelBalanceResponse.create({
    balance: 0, // TODO
    pendingOpenBalance: 0,
  });
  return response;
});

export const subscribeChannelEvents = jest.fn(async (address: string, sat: number): Promise<string> => {
  return ""; // TODO(hsjoberg)
});

export const exportAllChannelBackups = async (): Promise<lnrpc.ChanBackupSnapshot> => {
  const response = lnrpc.ChanBackupSnapshot.create({
    multiChanBackup: {
      // chanPoints
      multiChanBackup: new Uint8Array([1,2,3,4,5,6,7,8,9,10]),
    },
  });
  return response;
};
import { lnrpc } from "../../../proto/proto";
import Long from "long";
import * as base64 from "base64-js";
import { DeviceEventEmitter } from "react-native";
import { hexToUint8Array } from "../../utils";

/**
 * @throws
 */
export const openChannel = async (pubkey: string, amount: number, privateChannel: boolean): Promise<lnrpc.ChannelPoint> => {
  setTimeout(() => {
    const channelEventUpdate = lnrpc.ChannelEventUpdate.create({
      type: lnrpc.ChannelEventUpdate.UpdateType.OPEN_CHANNEL,
      openChannel: {
        active: true,
        capacity: Long.fromNumber(1000),
        chanId: Long.fromNumber(123456),
        channelPoint: "abc:123",
        private: true,
        remotePubkey: pubkey,
        localBalance: Long.fromNumber(10000),
      }
    });

    DeviceEventEmitter.emit(
      "SubscribeChannelEvents",
      { data: base64.fromByteArray(lnrpc.ChannelEventUpdate.encode(channelEventUpdate).finish()) }
    );
  }, 100);

  const response = lnrpc.ChannelPoint.create({
    fundingTxidBytes: new Uint8Array([0,1,2,3]),
    fundingTxidStr: "abcdef123456",
    outputIndex: 0,
  });
  return response;
  // const response = await sendCommand<lnrpc.IOpenChannelRequest, lnrpc.OpenChannelRequest, lnrpc.ChannelPoint>({
  //   request: lnrpc.OpenChannelRequest,
  //   response: lnrpc.ChannelPoint,
  //   method: "OpenChannelSync",
  //   options: {
  //     nodePubkeyString: pubkey,
  //     localFundingAmount: Long.fromValue(amount),
  //     targetConf: 2,
  //     private: privateChannel,
  //   },
  // });
  // return response;
};

/**
 * @throws
 * TODO implement
 */
export const closeChannel = async (fundingTxId: string, outputIndex: number): Promise<string> => {
  console.error("fake closeChannel not implemented");
  // const response = await sendStreamCommand<lnrpc.ICloseChannelRequest, lnrpc.CloseChannelRequest>({
  //   request: lnrpc.CloseChannelRequest,
  //   method: "CloseChannel",
  //   options: {
  //     channelPoint: {
  //       fundingTxidStr: fundingTxId,
  //       outputIndex,
  //     },
  //   },
  // }, false);
  // return response;
};

/**
 * @throws
 * TODO implement
 */
export const abandonChannel = async (fundingTxId: string, outputIndex: number): Promise<lnrpc.AbandonChannelResponse> => {
  console.log("fake abandonChannel not implemented");
  // const response = await sendCommand<lnrpc.IAbandonChannelRequest, lnrpc.AbandonChannelRequest, lnrpc.AbandonChannelResponse>({
  //   request: lnrpc.AbandonChannelRequest,
  //   response: lnrpc.AbandonChannelResponse,
  //   method: "AbandonChannel",
  //   options: {
  //     channelPoint: {
  //       fundingTxidStr: fundingTxId,
  //       outputIndex,
  //     }
  //   },
  // });
  // return response;
};

/**
 * @throws
 */
export const pendingChannels = async (): Promise<lnrpc.PendingChannelsResponse> => {
  const response = lnrpc.PendingChannelsResponse.create({
    pendingClosingChannels: [],
    pendingForceClosingChannels: [],
    pendingOpenChannels: [],
    waitingCloseChannels: [],
    totalLimboBalance: Long.fromNumber(0),
  });
  return response;
};

/**
 * @throws
 */
export const listChannels = async (): Promise<lnrpc.ListChannelsResponse> => {
  const response = lnrpc.ListChannelsResponse.create({
    channels: [{
      active: true,
      capacity: Long.fromNumber(1000),
      chanId: Long.fromNumber(0),
      channelPoint: "abc:0",
      localBalance: Long.fromNumber(490),
      localChanReserveSat: Long.fromNumber(10),
      remoteBalance: Long.fromNumber(500),
      remotePubkey: "abcdef1234567890",
    }],
  });
  return response;
};

/**
 * @throws
 */
export const channelBalance = async (): Promise<lnrpc.ChannelBalanceResponse> => {
  const response = lnrpc.ChannelBalanceResponse.create({
    balance: Long.fromValue(12345), // TODO
    pendingOpenBalance: Long.fromValue(0),
  });
  return response;
};

/**
 * @throws
 */
export const subscribeChannelEvents = async (): Promise<string> => {
  return ""; // TODO(hsjoberg)
};

/**
 * @throws
 */
export const exportAllChannelBackups = async (): Promise<lnrpc.ChanBackupSnapshot> => {
  const response = lnrpc.ChanBackupSnapshot.create({
    multiChanBackup: {
      // chanPoints
      multiChanBackup: new Uint8Array([1,2,3,4,5,6,7,8,9,10]),
    },
  });
  return response;
};

/**
 * @throws
 */
export const verifyChanBackup = async (channelsBackupBase64: string): Promise<lnrpc.VerifyChanBackupResponse> => {
  console.error("fake verifyChanBackup not implemented");
  // const response = await sendCommand<lnrpc.IChanBackupSnapshot, lnrpc.ChanBackupSnapshot, lnrpc.VerifyChanBackupResponse>({
  //   request: lnrpc.ChanBackupSnapshot,
  //   response: lnrpc.VerifyChanBackupResponse,
  //   method: "VerifyChanBackup",
  //   options: {
  //     multiChanBackup: {
  //       multiChanBackup: base64.toByteArray(channelsBackupBase64),
  //     },
  //   },
  // });
  // return response;
};

export const decodeChannelEvent = (data: string): lnrpc.ChannelEventUpdate => {
  if (data) {
    return lnrpc.ChannelEventUpdate.decode(base64.toByteArray(data));
  }
  return lnrpc.ChannelEventUpdate.create({});
};

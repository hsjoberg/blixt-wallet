import {
  IReadLndLogResponse,
  TEMP_moveLndToApplicationSupport,
  checkApplicationSupportExists,
  checkICloudEnabled,
  checkLndFolderExists,
  checkStatus,
  createIOSApplicationSupportAndLndDirectories,
  excludeLndICloudBackup,
  gossipSync,
  initialize,
  startLnd,
  writeConfig,
  writeConfigFile,
  generateSecureRandomAsBase64,
  generateSecureRandom,
} from "../lndmobile/index";

import {
  autopilotrpc,
  invoicesrpc,
  lnrpc,
  routerrpc,
  signrpc,
  walletrpc,
} from "../../proto/lightning";

import { WorkInfo } from "../lndmobile/LndMobile";
import { checkScheduledSyncWorkStatus } from "../lndmobile/scheduled-sync"; // TODO(hsjoberg): This could be its own injection "LndMobileScheduledSync"

export interface ILndMobileInjections {
  index: {
    initialize: () => Promise<{ data: string } | number>;
    writeConfig: (config: string) => Promise<string>;
    writeConfigFile: () => Promise<string>;
    generateSecureRandomAsBase64: (length: number) => Promise<string>;
    generateSecureRandom: (length: number) => Promise<Uint8Array>;
    subscribeState: () => Promise<string>;
    decodeState: (data: string) => lnrpc.SubscribeStateResponse;
    checkStatus: () => Promise<number>;
    startLnd: (torEnabled: boolean, args: string) => Promise<string>;
    gossipSync: (serviceUrl: string, networkType: string) => Promise<{ data: string }>;
    checkICloudEnabled: () => Promise<boolean>;
    checkApplicationSupportExists: () => Promise<boolean>;
    checkLndFolderExists: () => Promise<boolean>;
    createIOSApplicationSupportAndLndDirectories: () => Promise<boolean>;
    TEMP_moveLndToApplicationSupport: () => Promise<boolean>;
    excludeLndICloudBackup: () => Promise<boolean>;
    addInvoice: (
      amount: number,
      memo: string,
      expiry?: number,
      descriptionHash?: Uint8Array,
      preimage?: Uint8Array,
    ) => Promise<lnrpc.AddInvoiceResponse>;
    cancelInvoice: (paymentHash: string) => Promise<invoicesrpc.CancelInvoiceResp>;
    connectPeer: (pubkey: string, host: string) => Promise<lnrpc.ConnectPeerResponse>;
    disconnectPeer: (pubkey: string) => Promise<lnrpc.DisconnectPeerResponse>;
    decodePayReq: (bolt11: string) => Promise<lnrpc.PayReq>;
    getRecoveryInfo: () => Promise<lnrpc.GetRecoveryInfoResponse>;
    listUnspent: () => Promise<lnrpc.ListUnspentResponse>;
    resetMissionControl: () => Promise<routerrpc.ResetMissionControlResponse>;
    getInfo: () => Promise<lnrpc.GetInfoResponse>;
    getNetworkInfo: () => Promise<lnrpc.NetworkInfo>;
    getNodeInfo: (pubKey: string) => Promise<lnrpc.NodeInfo>;
    trackPaymentV2Sync: (rHash: string) => Promise<lnrpc.Payment>;
    lookupInvoice: (rHash: string) => Promise<lnrpc.Invoice>;
    listPeers: () => Promise<lnrpc.ListPeersResponse>;
    readLndLog: () => Promise<IReadLndLogResponse>;
    sendPaymentSync: (
      paymentRequest: string,
      amount?: Long,
      tlvRecordName?: string | null,
    ) => Promise<lnrpc.SendResponse>;
    sendPaymentV2Sync: (
      paymentRequest: string,
      amount?: Long,
      payAmount?: Long,
      tlvRecordName?: string | null,
      multiPath?: boolean,
      maxLNFeePercentage?: number,
      outgoingChannelId?: Long,
    ) => Promise<lnrpc.Payment>;
    queryRoutes: (
      pubkey: string,
      amount?: Long,
      routeHints?: lnrpc.IRouteHint[],
    ) => Promise<lnrpc.QueryRoutesResponse>;
    subscribeCustomMessages: () => Promise<string>;
    decodeCustomMessage: (data: string) => lnrpc.CustomMessage;
    sendCustomMessage: (
      peerPubkey: string,
      type: number,
      dataString: string,
    ) => Promise<lnrpc.SendCustomMessageResponse>;
  };
  channel: {
    channelBalance: () => Promise<lnrpc.ChannelBalanceResponse>;
    channelAcceptor: () => Promise<string>;
    decodeChannelAcceptRequest: (data: any) => lnrpc.ChannelAcceptRequest;
    channelAcceptorResponse: (
      pendingChanId: Uint8Array,
      accept: boolean,
      zeroConf?: boolean,
    ) => Promise<void>;
    closeChannel: (
      fundingTxId: string,
      outputIndex: number,
      force: boolean,
      deliveryAddress?: string,
    ) => Promise<string>;
    listChannels: () => Promise<lnrpc.ListChannelsResponse>;
    openChannel: (
      pubkey: string,
      amount: number,
      privateChannel: boolean,
      feeRateSat?: number,
      type?: lnrpc.CommitmentType,
    ) => Promise<lnrpc.ChannelPoint>;
    openChannelAll: (
      pubkey: string,
      privateChannel: boolean,
      feeRateSat?: number,
      type?: lnrpc.CommitmentType,
    ) => Promise<lnrpc.ChannelPoint>;
    pendingChannels: () => Promise<lnrpc.PendingChannelsResponse>;
    subscribeChannelEvents: () => Promise<string>;
    decodeChannelEvent: (data: string) => lnrpc.ChannelEventUpdate;
    exportAllChannelBackups: () => Promise<lnrpc.ChanBackupSnapshot>;
    abandonChannel: (
      fundingTxId: string,
      outputIndex: number,
    ) => Promise<lnrpc.AbandonChannelResponse>;
  };
  onchain: {
    getTransactions: () => Promise<lnrpc.TransactionDetails>;
    newAddress: (type: lnrpc.AddressType) => Promise<lnrpc.NewAddressResponse>;
    sendCoins: (address: string, sat: number, feeRate?: number) => Promise<lnrpc.SendCoinsResponse>;
    sendCoinsAll: (address: string, feeRate?: number) => Promise<lnrpc.SendCoinsResponse>;
    walletBalance: () => Promise<lnrpc.WalletBalanceResponse>;
    subscribeTransactions: () => Promise<string>;
    bumpFee: (feeRate: number, txid: string, index: number) => Promise<walletrpc.BumpFeeResponse>;
  };
  wallet: {
    decodeInvoiceResult: (data: string) => lnrpc.Invoice;
    genSeed: (passphrase: string | undefined) => Promise<lnrpc.GenSeedResponse>;
    initWallet: (
      seed: string[],
      password: string,
      recoveryWindow?: number,
      channelBackupsBase64?: string,
      aezeedPassphrase?: string,
    ) => Promise<void>;
    subscribeInvoices: () => Promise<string>;
    unlockWallet: (password: string) => Promise<void>;
    deriveKey: (keyFamily: number, keyIndex: number) => Promise<signrpc.KeyDescriptor>;
    derivePrivateKey: (keyFamily: number, keyIndex: number) => Promise<signrpc.KeyDescriptor>;
    verifyMessageNodePubkey: (
      signature: string,
      msg: Uint8Array,
    ) => Promise<lnrpc.VerifyMessageResponse>;
    signMessage: (
      keyFamily: number,
      keyIndex: number,
      msg: Uint8Array,
    ) => Promise<signrpc.SignMessageResp>;
    signMessageNodePubkey: (msg: Uint8Array) => Promise<lnrpc.SignMessageResponse>;
  };
  autopilot: {
    status: () => Promise<autopilotrpc.StatusResponse>;
    modifyStatus: (enable: boolean) => Promise<autopilotrpc.ModifyStatusResponse>;
    queryScores: () => Promise<autopilotrpc.QueryScoresResponse>;
    setScores: (scores: any) => Promise<autopilotrpc.SetScoresResponse>;
  };
  scheduledSync: {
    checkScheduledSyncWorkStatus: () => Promise<WorkInfo>;
  };
}

export default {
  index: {
    initialize,
    writeConfig,
    writeConfigFile,
    generateSecureRandomAsBase64,
    generateSecureRandom,
    checkStatus,
    startLnd,
    gossipSync,
    checkICloudEnabled,
    checkApplicationSupportExists,
    checkLndFolderExists,
    createIOSApplicationSupportAndLndDirectories,
    TEMP_moveLndToApplicationSupport,
    excludeLndICloudBackup,
  },

  scheduledSync: {
    checkScheduledSyncWorkStatus,
  },
} as unknown as ILndMobileInjections;

import {
  initialize,
  writeConfig,
  writeConfigFile,
  subscribeState,
  decodeState,
  checkStatus,
  startLnd,
  checkICloudEnabled,
  checkApplicationSupportExists,
  checkLndFolderExists,
  createIOSApplicationSupportAndLndDirectories,
  TEMP_moveLndToApplicationSupport,
  excludeLndICloudBackup,

  addInvoice,
  addInvoiceBlixtLsp,
  IAddInvoiceBlixtLspArgs,
  cancelInvoice,
  connectPeer,
  disconnectPeer,
  decodePayReq,
  getNodeInfo,
  getInfo,
  lookupInvoice,
  listPeers,
  readLndLog,
  sendPaymentSync,
  sendPaymentV2Sync,
  IReadLndLogResponse,
} from "../lndmobile/index";
import {
  channelBalance,
  closeChannel,
  listChannels,
  openChannel,
  pendingChannels,
  subscribeChannelEvents,
  decodeChannelEvent,
  exportAllChannelBackups,
  abandonChannel,
} from "../lndmobile/channel";
import {
  getTransactions,
  newAddress,
  sendCoins,
  sendCoinsAll,
  walletBalance,
  subscribeTransactions,
} from "../lndmobile/onchain";
import {
  decodeInvoiceResult,
  genSeed,
  initWallet,
  subscribeInvoices,
  unlockWallet,
  deriveKey,
  derivePrivateKey,
  verifyMessageNodePubkey,
  signMessage,
  signMessageNodePubkey,
} from "../lndmobile/wallet";
import {
  status,
  modifyStatus,
  queryScores,
  setScores,
} from "../lndmobile/autopilot";
import {
  checkScheduledSyncWorkStatus
} from "../lndmobile/scheduled-sync"; // TODO(hsjoberg): This could be its own injection "LndMobileScheduledSync"
import { lnrpc, signrpc, invoicesrpc, autopilotrpc } from "../../proto/proto";
import { WorkInfo } from "../lndmobile/LndMobile";

export interface ILndMobileInjections {
  index: {
    initialize: () => Promise<{ data: string } | number>;
    writeConfig: (config: string) => Promise<string>;
    writeConfigFile: () => Promise<string>;
    subscribeState: () => Promise<string>;
    decodeState: (data: string) => lnrpc.SubscribeStateResponse;
    checkStatus: () => Promise<number>;
    startLnd: (torEnabled: boolean) => Promise<string>;
    checkICloudEnabled: () => Promise<boolean>;
    checkApplicationSupportExists: () => Promise<boolean>;
    checkLndFolderExists: () => Promise<boolean>;
    createIOSApplicationSupportAndLndDirectories: () => Promise<boolean>;
    TEMP_moveLndToApplicationSupport: () => Promise<boolean>;
    excludeLndICloudBackup: () => Promise<boolean>;

    addInvoice: (amount: number, memo: string, expiry?: number) => Promise<lnrpc.AddInvoiceResponse>;
    addInvoiceBlixtLsp: (args: IAddInvoiceBlixtLspArgs) => Promise<lnrpc.AddInvoiceResponse>;
    cancelInvoice: (paymentHash: string) => Promise<invoicesrpc.CancelInvoiceResp>
    connectPeer: (pubkey: string, host: string) => Promise<lnrpc.ConnectPeerResponse>;
    disconnectPeer: (pubkey: string) => Promise<lnrpc.DisconnectPeerResponse>;
    decodePayReq: (bolt11: string) => Promise<lnrpc.PayReq>;
    getInfo: () => Promise<lnrpc.GetInfoResponse>;
    getNodeInfo: (pubKey: string) => Promise<lnrpc.NodeInfo>;
    lookupInvoice: (rHash: string) => Promise<lnrpc.Invoice>;
    listPeers: () => Promise<lnrpc.ListPeersResponse>;
    readLndLog: () => Promise<IReadLndLogResponse>;
    sendPaymentSync: (paymentRequest: string, amount?: Long, tlvRecordName?: string | null) => Promise<lnrpc.SendResponse>;
    sendPaymentV2Sync: (paymentRequest: string, amount?: Long, tlvRecordName?: string | null) => Promise<lnrpc.Payment>;
  };
  channel: {
    channelBalance: () => Promise<lnrpc.ChannelBalanceResponse>;
    closeChannel: (fundingTxId: string, outputIndex: number, force: boolean) => Promise<string>;
    listChannels: () => Promise<lnrpc.ListChannelsResponse>;
    openChannel: (pubkey: string, amount: number, privateChannel: boolean) => Promise<lnrpc.ChannelPoint>;
    pendingChannels: () => Promise<lnrpc.PendingChannelsResponse>;
    subscribeChannelEvents: () => Promise<string>;
    decodeChannelEvent: (data: string) => lnrpc.ChannelEventUpdate;
    exportAllChannelBackups: () => Promise<lnrpc.ChanBackupSnapshot>;
    abandonChannel: (fundingTxId: string, outputIndex: number) => Promise<lnrpc.AbandonChannelResponse>;
  };
  onchain: {
    getTransactions: () => Promise<lnrpc.TransactionDetails>;
    newAddress: (type: lnrpc.AddressType) => Promise<lnrpc.NewAddressResponse>;
    sendCoins: (address: string, sat: number, feeRate?: number) => Promise<lnrpc.SendCoinsResponse>;
    sendCoinsAll: (address: string, feeRate?: number) => Promise<lnrpc.SendCoinsResponse>;
    walletBalance: () => Promise<lnrpc.WalletBalanceResponse>;
    subscribeTransactions: () => Promise<string>;
  };
  wallet: {
    decodeInvoiceResult: (data: string) => lnrpc.Invoice;
    genSeed: () => Promise<lnrpc.GenSeedResponse>;
    initWallet: (seed: string[], password: string, recoveryWindow?: number, channelBackupsBase64?: string) => Promise<void>;
    subscribeInvoices: () => Promise<string>;
    unlockWallet: (password: string) => Promise<void>;
    deriveKey: (keyFamily: number, keyIndex: number) => Promise<signrpc.KeyDescriptor>;
    derivePrivateKey: (keyFamily: number, keyIndex: number) => Promise<signrpc.KeyDescriptor>;
    verifyMessageNodePubkey: (signature: string, msg: Uint8Array) => Promise<lnrpc.VerifyMessageResponse>;
    signMessage: (keyFamily: number, keyIndex: number, msg: Uint8Array) => Promise<signrpc.SignMessageResp>;
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
    checkStatus,
    subscribeState,
    decodeState,
    startLnd,
    checkICloudEnabled,
    checkApplicationSupportExists,
    checkLndFolderExists,
    createIOSApplicationSupportAndLndDirectories,
    TEMP_moveLndToApplicationSupport,
    excludeLndICloudBackup,

    addInvoice,
    addInvoiceBlixtLsp,
    cancelInvoice,
    connectPeer,
    disconnectPeer,
    decodePayReq,
    getNodeInfo,
    getInfo,
    lookupInvoice,
    listPeers,
    readLndLog,
    sendPaymentSync,
    sendPaymentV2Sync,
  },
  channel: {
    channelBalance,
    closeChannel,
    listChannels,
    openChannel,
    pendingChannels,
    subscribeChannelEvents,
    decodeChannelEvent,
    exportAllChannelBackups,
    abandonChannel,
  },
  onchain: {
    getTransactions,
    newAddress,
    sendCoins,
    sendCoinsAll,
    walletBalance,
    subscribeTransactions,
  },
  wallet: {
    decodeInvoiceResult,
    genSeed,
    initWallet,
    subscribeInvoices,
    unlockWallet,
    deriveKey,
    derivePrivateKey,
    verifyMessageNodePubkey,
    signMessage,
    signMessageNodePubkey,
  },
  autopilot: {
    status,
    modifyStatus,
    queryScores,
    setScores,
  },
  scheduledSync: {
    checkScheduledSyncWorkStatus,
  },
} as ILndMobileInjections;

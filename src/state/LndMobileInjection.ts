import {
  init,
  writeConfigFile,
  checkStatus,
  startLnd,

  addInvoice,
  connectPeer,
  decodePayReq,
  getNodeInfo,
  getInfo,
  lookupInvoice,
  readLndLog,
  sendPaymentSync,
  IReadLndLogResponse,
} from "../lndmobile/index";
import {
  channelBalance,
  closeChannel,
  listChannels,
  openChannel,
  pendingChannels,
} from "../lndmobile/channel";
import {
  getTransactions,
  newAddress,
  sendCoins,
  walletBalance,
} from "../lndmobile/onchain";
import {
  decodeInvoiceResult,
  genSeed,
  initWallet,
  subscribeInvoices,
  unlockWallet,
} from "../lndmobile/wallet";
import { lnrpc } from "../../proto/proto";

export interface ILndMobileInjections {
  index: {
    init: () => Promise<{ data: string } | number>;
    writeConfigFile: () => Promise<string>;
    checkStatus: () => Promise<number>;
    startLnd: () => Promise<string>;

    addInvoice: (amount: number, memo: string, expiry?: number) => Promise<lnrpc.AddInvoiceResponse>;
    connectPeer: (pubkey: string, host: string) => Promise<lnrpc.ConnectPeerResponse>;
    decodePayReq: (bolt11: string) => Promise<lnrpc.PayReq>;
    getInfo: () => Promise<lnrpc.GetInfoResponse>;
    getNodeInfo: (pubKey: string) => Promise<lnrpc.NodeInfo>;
    lookupInvoice: (rHash: string) => Promise<lnrpc.Invoice>;
    readLndLog: () => Promise<IReadLndLogResponse>;
    sendPaymentSync: (paymentRequest: string) => Promise<lnrpc.SendResponse>;
  };
  channel: {
    channelBalance: () => Promise<lnrpc.ChannelBalanceResponse>;
    closeChannel: (fundingTxId: string, outputIndex: number) => Promise<string>;
    listChannels: () => Promise<lnrpc.ListChannelsResponse>;
    openChannel: (pubkey: string, amount: number) => Promise<lnrpc.ChannelPoint>;
    pendingChannels: () => Promise<lnrpc.PendingChannelsResponse>;
  };
  onchain: {
    getTransactions: () => Promise<lnrpc.TransactionDetails>;
    newAddress: (type: lnrpc.AddressType) => Promise<lnrpc.NewAddressResponse>;
    sendCoins: (address: string, sat: number) => Promise<lnrpc.SendCoinsResponse>;
    walletBalance: () => Promise<lnrpc.WalletBalanceResponse>;
  };
  wallet: {
    decodeInvoiceResult: (data: string) => lnrpc.Invoice;
    genSeed: () => Promise<lnrpc.GenSeedResponse>;
    initWallet: (seed: string[], password: string) => Promise<lnrpc.InitWalletResponse>;
    subscribeInvoices: () => Promise<string>;
    unlockWallet: (password: string) => Promise<lnrpc.UnlockWalletResponse>;
  };
}

export default {
  index: {
    init,
    writeConfigFile,
    checkStatus,
    startLnd,

    addInvoice,
    connectPeer,
    decodePayReq,
    getNodeInfo,
    getInfo,
    lookupInvoice,
    readLndLog,
    sendPaymentSync,
  },
  channel: {
    channelBalance,
    closeChannel,
    listChannels,
    openChannel,
    pendingChannels,
  },
  onchain: {
    getTransactions,
    newAddress,
    sendCoins,
    walletBalance,
  },
  wallet: {
    decodeInvoiceResult,
    genSeed,
    initWallet,
    subscribeInvoices,
    unlockWallet,
  },
} as ILndMobileInjections;

import { lnrpc } from "../../../proto/proto";
import Long from "long";

export const getTransactions = async (): Promise<lnrpc.TransactionDetails> => {
  const response = lnrpc.TransactionDetails.create({
    transactions: [{
      amount: Long.fromValue(100),
      blockHash: "abcdef12345",
      blockHeight: 1000,
      destAddresses: ["abcdef123456"],
      numConfirmations: 1,
      rawTxHex: "abcdef12345",
      timeStamp: Long.fromValue(100),
      totalFees: Long.fromValue(1000),
      txHash: "abcdef",
    }]
  });
  return response;
};

export const newAddress = async (type: lnrpc.AddressType = lnrpc.AddressType.WITNESS_PUBKEY_HASH): Promise<lnrpc.NewAddressResponse> => {
  const response = lnrpc.NewAddressResponse.create({ address: "tb1qsl4hhqs8skzwknqhwjcyyyjepnwmq8tlcd32m3" });
  return response;
};

export const walletBalance = async (): Promise<lnrpc.WalletBalanceResponse> => {
  const response = lnrpc.WalletBalanceResponse.create({
    confirmedBalance: Long.fromNumber(1000),
    totalBalance: Long.fromNumber(0),
    unconfirmedBalance: Long.fromNumber(0),
  });
  return response;
};

export const sendCoins = async (address: string, sat: number): Promise<lnrpc.SendCoinsResponse> => {
  const response = lnrpc.SendCoinsResponse.create({
    txid: "7836ca1453ef598b989a09496f48be17e14950a44e6ab2526b4a7fc17f9e4591",
  });
  return response;
};

export const sendCoinsAll = async (address: string, feeRate?: number): Promise<lnrpc.SendCoinsResponse> => {
  const response = lnrpc.SendCoinsResponse.create({
    txid: "7836ca1453ef598b989a09496f48be17e14950a44e6ab2526b4a7fc17f9e4591",
  });
  return response;
};

export const subscribeTransactions = async (): Promise<string> => {
  return ""; // TODO(hsjoberg)
};

export const decodeSubscribeTransactionsResult = (data: string): lnrpc.Transaction => {
  console.error("fake decodeSubscribeTransactionsResult not implemented");
  // return decodeStreamResult<lnrpc.Transaction>({
  //   response: lnrpc.Transaction,
  //   base64Result: data,
  // });
};

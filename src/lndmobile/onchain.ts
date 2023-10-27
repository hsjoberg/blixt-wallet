import { sendCommand, sendStreamCommand, decodeStreamResult } from "./utils";
import { lnrpc, walletrpc } from "../../proto/lightning";
import Long from "long";

/**
 * @throws
 */
export const getTransactions = async (): Promise<lnrpc.TransactionDetails> => {
  const response = await sendCommand<
    lnrpc.IGetTransactionsRequest,
    lnrpc.GetTransactionsRequest,
    lnrpc.TransactionDetails
  >({
    request: lnrpc.GetTransactionsRequest,
    response: lnrpc.TransactionDetails,
    method: "GetTransactions",
    options: {},
  });
  return response;
};

/**
 * @throws
 */
export const newAddress = async (
  type: lnrpc.AddressType = lnrpc.AddressType.UNUSED_WITNESS_PUBKEY_HASH,
): Promise<lnrpc.NewAddressResponse> => {
  const response = await sendCommand<
    lnrpc.INewAddressRequest,
    lnrpc.NewAddressRequest,
    lnrpc.NewAddressResponse
  >({
    request: lnrpc.NewAddressRequest,
    response: lnrpc.NewAddressResponse,
    method: "NewAddress",
    options: {
      type,
    },
  });
  return response;
};

/**
 * @throws
 */
export const walletBalance = async (): Promise<lnrpc.WalletBalanceResponse> => {
  const response = await sendCommand<
    lnrpc.IWalletBalanceRequest,
    lnrpc.WalletBalanceRequest,
    lnrpc.WalletBalanceResponse
  >({
    request: lnrpc.WalletBalanceRequest,
    response: lnrpc.WalletBalanceResponse,
    method: "WalletBalance",
    options: {},
  });
  return response;
};

/**
 * @throws
 */
export const sendCoins = async (
  address: string,
  sat: number,
  feeRate?: number,
): Promise<lnrpc.SendCoinsResponse> => {
  const response = await sendCommand<
    lnrpc.ISendCoinsRequest,
    lnrpc.SendCoinsRequest,
    lnrpc.SendCoinsResponse
  >({
    request: lnrpc.SendCoinsRequest,
    response: lnrpc.SendCoinsResponse,
    method: "SendCoins",
    options: {
      addr: address,
      amount: Long.fromValue(sat),
      satPerByte: feeRate ? Long.fromValue(feeRate) : undefined,
    },
  });
  return response;
};

/**
 * @throws
 */
export const sendCoinsAll = async (
  address: string,
  feeRate?: number,
): Promise<lnrpc.SendCoinsResponse> => {
  const response = await sendCommand<
    lnrpc.ISendCoinsRequest,
    lnrpc.SendCoinsRequest,
    lnrpc.SendCoinsResponse
  >({
    request: lnrpc.SendCoinsRequest,
    response: lnrpc.SendCoinsResponse,
    method: "SendCoins",
    options: {
      addr: address,
      sendAll: true,
      satPerByte: feeRate ? Long.fromValue(feeRate) : undefined,
    },
  });
  return response;
};

/**
 * @throws
 * TODO test
 */
export const subscribeTransactions = async (): Promise<string> => {
  // API docs say that GetTransactionsRequest should be used
  // https://api.lightning.community/#subscribetransactions
  const response = await sendStreamCommand<
    lnrpc.IGetTransactionsRequest,
    lnrpc.GetTransactionsRequest
  >(
    {
      request: lnrpc.GetTransactionsRequest,
      method: "SubscribeTransactions",
      options: {},
    },
    true,
  );
  return response;
};

export const decodeSubscribeTransactionsResult = (data: string): lnrpc.Transaction => {
  return decodeStreamResult<lnrpc.Transaction>({
    response: lnrpc.Transaction,
    base64Result: data,
  });
};

// Bump fee
export const bumpFee = async (
  feeRate: number,
  txid: string,
  index: number,
): Promise<walletrpc.BumpFeeResponse> => {
  console.log("inside");
  const response = await sendCommand<
    walletrpc.BumpFeeRequest,
    walletrpc.IBumpFeeRequest,
    walletrpc.BumpFeeResponse
  >({
    request: walletrpc.BumpFeeRequest,
    response: walletrpc.BumpFeeResponse,
    method: "BumpFee",
    options: {
      outpoint: {
        txidStr: txid,
        outputIndex: index,
      },
      force: false,
      targetConf: 1,
      satPerByte: 0,
      satPerVbyte: Long.fromValue(feeRate),
      toJSON: function (): { [k: string]: any } {
        throw new Error("Function not implemented.");
      },
    },
  });

  console.log(response);
  return response;
};

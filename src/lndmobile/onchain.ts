import { sendCommand } from "./utils";
import { lnrpc } from "../../proto/proto";

/**
 * @throws
 */
export const getTransactions = async (): Promise<lnrpc.TransactionDetails> => {
  const response = await sendCommand<lnrpc.IGetTransactionsRequest, lnrpc.GetTransactionsRequest, lnrpc.TransactionDetails>({
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
export const newAddress = async (type: lnrpc.AddressType = lnrpc.AddressType.WITNESS_PUBKEY_HASH): Promise<lnrpc.NewAddressResponse> => {
  const response = await sendCommand<lnrpc.INewAddressRequest, lnrpc.NewAddressRequest, lnrpc.NewAddressResponse>({
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
  const response = await sendCommand<lnrpc.IWalletBalanceRequest, lnrpc.WalletBalanceRequest, lnrpc.WalletBalanceResponse>({
    request: lnrpc.WalletBalanceRequest,
    response: lnrpc.WalletBalanceResponse,
    method: "WalletBalance",
    options: {},
  });
  return response;
};

/**
 * @throws
 * TODO test
 */
export const sendCoins = async (address: string, sat: number): Promise<lnrpc.SendCoinsResponse> => {
  const response = await sendCommand<lnrpc.ISendCoinsRequest, lnrpc.SendCoinsRequest, lnrpc.SendCoinsResponse>({
    request: lnrpc.SendCoinsRequest,
    response: lnrpc.SendCoinsResponse,
    method: "SendCoins",
    options: {
      addr: address,
      amount: sat,
    },
  });
  return response;
};

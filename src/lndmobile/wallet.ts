import { sendCommand, sendStreamCommand, decodeStreamResult } from "./utils";
import { Buffer } from "buffer";

import { lnrpc } from "../../proto/proto";


/**
 * @throws
 * TODO test
 */
export const genSeed = async (): Promise<lnrpc.GenSeedResponse> => {
  const response = await sendCommand<lnrpc.IGenSeedRequest, lnrpc.GenSeedRequest, lnrpc.GenSeedResponse>({
    request: lnrpc.GenSeedRequest,
    response: lnrpc.GenSeedResponse,
    method: "GenSeed",
    options: {},
  });
  return response;
};

export const initWallet = async (seed: string[], password: string): Promise<lnrpc.InitWalletResponse> => {
  const response = await sendCommand<lnrpc.IInitWalletRequest, lnrpc.InitWalletRequest, lnrpc.InitWalletResponse>({
    request: lnrpc.InitWalletRequest,
    response: lnrpc.InitWalletResponse,
    method: "InitWallet",
    options: {
      cipherSeedMnemonic: seed,
      walletPassword: Buffer.from(password, "utf8"),
    },
  });
  return response;
};

/**
 * @throws
 */
export const unlockWallet = async (password: string): Promise<lnrpc.UnlockWalletResponse> => {
  const response = await sendCommand<lnrpc.IUnlockWalletRequest, lnrpc.UnlockWalletRequest, lnrpc.UnlockWalletResponse>({
    request: lnrpc.UnlockWalletRequest,
    response: lnrpc.UnlockWalletResponse,
    method: "UnlockWallet",
    options: {
      walletPassword: Buffer.from(password, "utf8"),
    },
  });
  return response;
};

// TODO exception?
export const subscribeInvoices = async (): Promise<string> => {
  try {
    const response = await sendStreamCommand<lnrpc.IInvoiceSubscription, lnrpc.InvoiceSubscription>({
      request: lnrpc.InvoiceSubscription,
      method: "SubscribeInvoices",
      options: {},
    });
    return response;
  } catch (e) { throw e.message; }
};

// TODO error handling
export const decodeInvoiceResult = (data: string): lnrpc.Invoice => {
  return decodeStreamResult<lnrpc.Invoice>({
    response: lnrpc.Invoice,
    base64Result: data,
  });
};

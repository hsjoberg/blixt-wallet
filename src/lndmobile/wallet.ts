import { sendCommand, sendStreamCommand, decodeStreamResult } from "./utils";
import { Buffer } from "buffer";
import * as base64 from "base64-js";

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

export const initWallet = async (seed: string[], password: string, recoveryWindow?: number, channelBackupsBase64?: string): Promise<lnrpc.InitWalletResponse> => {
  const options: lnrpc.IInitWalletRequest = {
    cipherSeedMnemonic: seed,
    walletPassword: Buffer.from(password, "utf8"), // TODO(hsjoberg) Buffer.from???
  };
  if (recoveryWindow) {
    options.recoveryWindow = recoveryWindow;
  }
  if (channelBackupsBase64) {
    options.channelBackups = {
      multiChanBackup: {
        multiChanBackup: base64.toByteArray(channelBackupsBase64),
      }
    }
  }

  const response = await sendCommand<lnrpc.IInitWalletRequest, lnrpc.InitWalletRequest, lnrpc.InitWalletResponse>({
    request: lnrpc.InitWalletRequest,
    response: lnrpc.InitWalletResponse,
    method: "InitWallet",
    options
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
      // TODO recoveryWindow might be needed here when restoring
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
    }, true);
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

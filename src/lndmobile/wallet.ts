import { NativeModules } from "react-native";
import { sendCommand, sendStreamCommand, decodeStreamResult } from "./utils";
import { stringToUint8Array } from "../utils/index";
import * as base64 from "base64-js";

import { lnrpc } from "../../proto/proto";

const { LndMobile } = NativeModules;

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

export const initWallet = async (seed: string[], password: string, recoveryWindow?: number, channelBackupsBase64?: string): Promise<void> => {
  await NativeModules.LndMobile.initWallet(seed, password, recoveryWindow || 0, channelBackupsBase64 || null);
  return;
  // const options: lnrpc.IInitWalletRequest = {
  //   cipherSeedMnemonic: seed,
  //   walletPassword: stringToUint8Array(password),
  // };
  // if (recoveryWindow) {
  //   options.recoveryWindow = recoveryWindow;
  // }
  // if (channelBackupsBase64) {
  //   options.channelBackups = {
  //     multiChanBackup: {
  //       multiChanBackup: base64.toByteArray(channelBackupsBase64),
  //     }
  //   }
  // }

  // const response = await sendCommand<lnrpc.IInitWalletRequest, lnrpc.InitWalletRequest, lnrpc.InitWalletResponse>({
  //   request: lnrpc.InitWalletRequest,
  //   response: lnrpc.InitWalletResponse,
  //   method: "InitWallet",
  //   options
  // });
  // return response;
};

/**
 * @throws
 */
export const unlockWallet = async (password: string, cb: any): Promise<void> => {
  const start = new Date().getTime();
  await NativeModules.LndMobile.unlockWallet(password);
  // const response = await sendCommand<lnrpc.IUnlockWalletRequest, lnrpc.UnlockWalletRequest, lnrpc.UnlockWalletResponse>({
  //   request: lnrpc.UnlockWalletRequest,
  //   response: lnrpc.UnlockWalletResponse,
  //   method: "UnlockWallet",
  //   options: {
  //     walletPassword: stringToUint8Array(password),
  //     // TODO recoveryWindow might be needed here when restoring
  //   },
  // });
  // return response;
  console.log("unlock time: " + (new Date().getTime() - start) / 1000 + "s");
  return;
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

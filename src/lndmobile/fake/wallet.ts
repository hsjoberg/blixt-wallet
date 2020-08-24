import { stringToUint8Array, timeout, hexToUint8Array } from "../../utils/index";
import * as base64 from "base64-js";

import { lnrpc, walletrpc, signrpc,  } from "../../../proto/proto";
import { DeviceEventEmitter } from "react-native";
import Long from "long";

export const genSeed = async (): Promise<lnrpc.GenSeedResponse> => {
  const response = lnrpc.GenSeedResponse.create({
    cipherSeedMnemonic: ['ability', 'quote', 'laugh', 'pony', 'fancy', 'disease', 'zoo', 'angle', 'autumn', 'december', 'absorb', 'giraffe', 'mandate', 'inner', 'alone', 'flat', 'dose', 'acoustic', 'slice', 'major', 'sample', 'crane', 'opinion', 'jewel'],
    encipheredSeed: new Uint8Array([0, 54, 1, 246, 83, 245, 46, 126, 63, 248, 70, 15, 167, 20, 3, 49, 24, 112, 232, 193, 186, 196, 65, 128, 67, 45, 195, 59, 240, 100, 166, 219, 191])
  });
  return response;
};

export const initWallet = async (seed: string[], password: string): Promise<void> => {
  return;
};

export const unlockWallet = async (password: string): Promise<void> => {
  setTimeout(() => DeviceEventEmitter.emit("WalletUnlocked"), 1000);
  return;
};

export const subscribeInvoices = async (): Promise<string> => {
  await timeout(10);
  return "done";
};

/**
 * @throws
 */
export const deriveKey = async (keyFamily: number, keyIndex: number): Promise<signrpc.KeyDescriptor> => {
  console.error("fake deriveKey not implemented");
  // const response = await sendCommand<signrpc.IKeyLocator, signrpc.KeyLocator, signrpc.KeyDescriptor>({
  //   request: signrpc.KeyLocator,
  //   response: signrpc.KeyDescriptor,
  //   method: "WalletKitDeriveKey",
  //   options: {
  //     keyFamily: 138,
  //     keyIndex: 0,
  //   },
  // });
  // return response;
};

/**
 * @throws
 */
export const derivePrivateKey = async (keyFamily: number, keyIndex: number): Promise<signrpc.KeyDescriptor> => {
  console.error("fake derivePrivateKey not implemented");
  // const response = await sendCommand<signrpc.IKeyDescriptor, signrpc.KeyDescriptor, signrpc.KeyDescriptor>({
  //   request: signrpc.KeyDescriptor,
  //   response: signrpc.KeyDescriptor,
  //   method: "WalletKitDerivePrivateKey",
  //   options: {
  //     keyLoc: {
  //       keyFamily,
  //       keyIndex,
  //     },
  //   },
  // });
  // return response;
};

/**
 * @throws
 */
export const signMessage = async (keyFamily: number, keyIndex: number, msg: Uint8Array): Promise<signrpc.SignMessageResp> => {
  console.error("fake signMessage not implemented");
  // const response = await sendCommand<signrpc.ISignMessageReq, signrpc.SignMessageReq, signrpc.SignMessageResp>({
  //   request: signrpc.SignMessageReq,
  //   response: signrpc.SignMessageResp,
  //   method: "SignerSignMessage",
  //   options: {
  //     keyLoc: {
  //       keyFamily,
  //       keyIndex,
  //     },
  //     msg,
  //     noHashing: true,
  //   },
  // });
  // return response;
};

// TODO error handling
export const decodeInvoiceResult = (data: string): lnrpc.Invoice => {
  if (data) {
    return lnrpc.Invoice.decode(base64.toByteArray(data));
  }

  const unixTimestamp = Math.floor(Date.now() / 1000);

  const invoice = lnrpc.Invoice.create({
    paymentRequest: "abc",
    private: false,
    memo: "Memo",
    addIndex: Long.fromNumber(0), // TODO
    amtPaid: Long.fromNumber(100),
    rHash: new Uint8Array([1, 2, 3]), // TODO
    value: Long.fromNumber(100),
    amtPaidMsat: Long.fromNumber(100).mul(1000),
    amtPaidSat: Long.fromNumber(100),
    cltvExpiry: Long.fromNumber(3600),
    creationDate: Long.fromNumber(unixTimestamp),
    expiry: Long.fromNumber(3600),
    rPreimage: new Uint8Array([1, 2, 3, 4]), // TODO
    settled: false,
    state: lnrpc.Invoice.InvoiceState.OPEN,
  });
  return invoice;
};

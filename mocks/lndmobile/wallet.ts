import { Buffer } from "buffer";
import { lnrpc } from "../../proto/proto";

export const genSeed = jest.fn(async (): Promise<lnrpc.GenSeedResponse> => {
  const response = lnrpc.GenSeedResponse.create({
    cipherSeedMnemonic: ['ability', 'quote', 'laugh', 'pony', 'fancy', 'disease', 'zoo', 'angle', 'autumn', 'december', 'absorb', 'giraffe', 'mandate', 'inner', 'alone', 'flat', 'dose', 'acoustic', 'slice', 'major', 'sample', 'crane', 'opinion', 'jewel'],
    encipheredSeed: new Uint8Array([0, 54, 1, 246, 83, 245, 46, 126, 63, 248, 70, 15, 167, 20, 3, 49, 24, 112, 232, 193, 186, 196, 65, 128, 67, 45, 195, 59, 240, 100, 166, 219, 191])
  });
  return response;
});

export const initWallet = jest.fn(async (seed: string[], password: string): Promise<lnrpc.InitWalletResponse> => {
  const response = lnrpc.InitWalletResponse.create({});
  return response;
});

export const unlockWallet = jest.fn(async (password: string): Promise<lnrpc.UnlockWalletResponse> => {
  const response = lnrpc.UnlockWalletResponse.create({});
  return response;
});

export const subscribeInvoices = jest.fn(async (): Promise<string> => {
  return "done";
});
//
// // TODO error handling
// export const decodeInvoiceResult = (data: string): lnrpc.Invoice => {
//   return decodeStreamResult<lnrpc.Invoice>({
//     response: lnrpc.Invoice,
//     base64Result: data,
//   });
// };

import { lnrpc } from "../../proto/proto";
import { decodeStreamResult, timeout } from "./utils";
import { DeviceEventEmitter } from "react-native";
import * as base64 from "base64-js";
import payReq from "bolt11";
import Long from "long";
import { IAddInvoiceBlixtLspArgs } from "../../src/lndmobile";

export enum ELndMobileStatusCodes {
  STATUS_SERVICE_BOUND = 1,
  STATUS_PROCESS_STARTED = 2,
  STATUS_WALLET_UNLOCKED = 4,
}

let LndMobileStatus = 0;

export const initialize = jest.fn(async (): Promise<{ data: string } | number> => {
  await timeout(10);
  LndMobileStatus += ELndMobileStatusCodes.STATUS_SERVICE_BOUND; // TODO figure out bitmasking...
  return { data: "" };
});

export const checkStatus = jest.fn(async (): Promise<number> => {
  return LndMobileStatus;
});

export const writeConfig = jest.fn(async () => {
  return "File written:";
});

export const writeConfigFile = jest.fn(async () => {
  return "File written:";
});

export const subscribeStateEmitter = (data: Uint8Array) => DeviceEventEmitter.emit("SubscribeState", { data: base64.fromByteArray(data) });
export const subscribeState = async () => {
  setTimeout(async () => {
    subscribeStateEmitter(
      lnrpc.SubscribeStateResponse.encode({
        state: lnrpc.WalletState.LOCKED,
      }).finish()
    );
  }, 10)
}

export const decodeState = (data: string): lnrpc.SubscribeStateResponse => {
  return decodeStreamResult<lnrpc.SubscribeStateResponse>({
    response: lnrpc.SubscribeStateResponse,
    base64Result: data,
  });
};

export const startLnd = jest.fn(async (): Promise<string> => {
  await timeout(100);
  return "started";
});

// export const connectPeer = async (pubkey: string, host: string): Promise<lnrpc.ConnectPeerResponse> => {
//   return await sendCommand<lnrpc.IConnectPeerRequest, lnrpc.ConnectPeerRequest, lnrpc.ConnectPeerResponse>({
//     request: lnrpc.ConnectPeerRequest,
//     response: lnrpc.ConnectPeerResponse,
//     method: "ConnectPeer",
//     options: {
//       addr: lnrpc.LightningAddress.create({
//         host,
//         pubkey,
//       }),
//     },
//   });
// };
//
// export const getNodeInfo = async (pubKey: string): Promise<lnrpc.NodeInfo> => {
//   const response = await sendCommand<lnrpc.INodeInfoRequest, lnrpc.NodeInfoRequest, lnrpc.NodeInfo>({
//     request: lnrpc.NodeInfoRequest,
//     response: lnrpc.NodeInfo,
//     method: "GetNodeInfo",
//     options: {
//       pubKey,
//     },
//   });
//   return response;
// };

export const getInfoResponse = lnrpc.GetInfoResponse.create({
  uris: [],
  chains: [{
    chain: "bitcoin",
    network: "testnet",
  }],
  identityPubkey: "02b5380da0919e32b13c1a21c1c85000eed0ba9a9309fc6849d72230d43088ae1d",
  alias: "02b5380da0919e32b13c",
  numPeers: 3,
  blockHeight: 1572555,
  blockHash: "000000000000006cb43faa5c615e45419f48e9d94d77c1bab8a28018cf2db6ef",
  syncedToChain: false,
  syncedToGraph: false,
  testnet: true,
  bestHeaderTimestamp: Long.fromNumber(1564940232),
  version: "0.7.1-beta commit=v0.7.1-beta-rc1-10-g3760f29f5e758b2865b756604333ca22cf23e90b",
  features: {},
});
export const getInfo = jest.fn()
  .mockImplementationOnce(async () => getInfoResponse)
  .mockImplementation(async () =>  ({ ...getInfoResponse, syncedToChain: true, syncedToGraph: true }));

export const sendPaymentSync = async (paymentRequest: string): Promise<lnrpc.SendResponse> => {
  const response = lnrpc.SendResponse.create({
    paymentHash: new Uint8Array([1,2,3,4]),
    paymentRoute: {
      totalAmt: Long.fromNumber(1000),
      totalAmtMsat: Long.fromNumber(1000000),
      totalFees: Long.fromNumber(1),
      totalFeesMsat: Long.fromNumber(1000),
      hops: [],
    },
  });
  return response;
};


export const addInvoice = async (amount: number, memo: string, expiry: number = 3600): Promise<lnrpc.AddInvoiceResponse> => {
  try {
    const unixTimestamp = Math.floor(Date.now() / 1000);
    const encoded = payReq.encode({
      coinType: "testnet",
      satoshis: amount,
      timestamp: unixTimestamp,
      timeExpireDate: expiry,
      tags: [{
        tagName: "payment_hash",
        data: "0001020304050607080900010203040506070809000102030405060708090102",
      }, {
        tagName: "description",
        data: memo,
      }],
    });

    const privateKeyHex = "e126f68f7eafcc8b74f54d269fe206be715000f94dac067d1c04a8ca3b2db734";
    const signed = payReq.sign(encoded, privateKeyHex);

    const response = lnrpc.AddInvoiceResponse.create({
      paymentRequest: signed!.paymentRequest,
      addIndex: Long.fromNumber(0),
      rHash: new Uint8Array([1, 2, 3]), // TODO
    });

    setTimeout(() => {
      const description = signed!.tags.find((tag) => tag.tagName === "d");
      const cltvExpiry = signed!.tags.find((tag) => tag.tagName === "min_final_cltv_expiry");
      const invoice = lnrpc.Invoice.create({
        paymentRequest: signed!.paymentRequest,
        private: false,
        memo: description && (description.data as string),
        addIndex: Long.fromNumber(0), // TODO
        amtPaid: Long.fromNumber(100),
        rHash: new Uint8Array([1, 2, 3]), // TODO
        value: Long.fromNumber(signed!.satoshis!),
        amtPaidMsat: Long.fromNumber(signed!.satoshis!).mul(1000),
        amtPaidSat: Long.fromNumber(signed!.satoshis!),
        cltvExpiry: cltvExpiry && (Long.fromNumber(cltvExpiry.data as number)),
        creationDate: Long.fromNumber(signed!.timestamp!),
        expiry: Long.fromNumber(expiry),
        rPreimage: new Uint8Array([1, 2, 3, 4]), // TODO
        settled: false,
        state: lnrpc.Invoice.InvoiceState.OPEN,
      });
      DeviceEventEmitter.emit("SubscribeInvoices", {
        data: base64.fromByteArray(lnrpc.Invoice.encode(invoice).finish()),
      });
    }, 5);

    return response;
  } catch (e) {
    console.log(e);
    throw e;
  }
};

export const addInvoiceBlixtLsp = ({amount, memo, expiry = 600, servicePubkey, chanId, cltvExpiryDelta, feeBaseMsat, feeProportionalMillionths, preimage}: IAddInvoiceBlixtLspArgs) => {
  return addInvoice(amount, memo, expiry);
}

//
// export const lookupInvoice = async (rHash: string): Promise<lnrpc.Invoice> => {
//   const response = await sendCommand<lnrpc.IPaymentHash, lnrpc.PaymentHash, lnrpc.Invoice>({
//     request: lnrpc.PaymentHash,
//     response: lnrpc.Invoice,
//     method: "LookupInvoice",
//     options: {
//       rHashStr: rHash,
//     },
//   });
//   return response;
// };

// TODO test
export const decodePayReq = async (bolt11: string): Promise<lnrpc.PayReq> => {
  const payreq = payReq.decode(bolt11); // todo check second argument
  const description = payreq.tags.find((tag) => tag.tagName === "d");
  const response = lnrpc.PayReq.create({
    cltvExpiry: Long.fromNumber(144), // TODO
    description: description && (description.data as string),
    destination: payreq.payeeNodeKey,
    expiry: Long.fromNumber(payreq.timeExpireDate! - payreq.timeExpireDate!),
    numSatoshis: Long.fromNumber(payreq.satoshis || 0),
    timestamp: Long.fromNumber(payreq.timeExpireDate || 0),
    paymentHash: Math.floor(Math.random() * 1000000).toString(),
  });
  return response;
};

// export type IReadLndLogResponse = string[];
//
// export const readLndLog = async (): Promise<IReadLndLogResponse> => {
//   return [""];
// };

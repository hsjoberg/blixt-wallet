import { NativeModules, DeviceEventEmitter } from "react-native";
import { generateSecureRandom } from "react-native-securerandom";
import { lnrpc, routerrpc, invoicesrpc } from "../../../proto/proto";
import Long from "long";
import sha from "sha.js";
import { stringToUint8Array, timeout, bytesToHexString } from "../../utils";
import { TLV_RECORD_NAME } from "../../utils/constants";

import * as base64 from "base64-js";
import payReq from "bolt11";
import { decodeStreamResult } from "../utils";
import { IAddInvoiceBlixtLspArgs } from "../index";

const { LndMobileTools } = NativeModules;

let LndMobileStatus = 0;

/**
 * @throws
 * TODO return values are terrible
 */
export const initialize = async (): Promise<{ data: string } | number> => {
  await timeout(10);
  LndMobileStatus += ELndMobileStatusCodes.STATUS_SERVICE_BOUND; // TODO figure out bitmasking...
  return { data: "" };
};

export enum ELndMobileStatusCodes {
  STATUS_SERVICE_BOUND = 1,
  STATUS_PROCESS_STARTED = 2,
  STATUS_WALLET_UNLOCKED = 4,
}

export const checkStatus = async (): Promise<number> => {
  return LndMobileStatus;
};

/**
 * @throws
 * @return string
 */
export const writeConfig = async (config: string) => {
  return "File written:";
};

/**
 * @throws
 * @return string
 */
export const writeConfigFile = async () => {
  return "File written:";
};

export const subscribeStateEmitter = (data: Uint8Array) => DeviceEventEmitter.emit("SubscribeState", { data: base64.fromByteArray(data) });
export const subscribeState = async () => {
  subscribeStateEmitter(
    lnrpc.SubscribeStateResponse.encode({
      state: lnrpc.WalletState.LOCKED,
    }).finish()
  );
  return "subscribing";
}

export const decodeState = (data: string): lnrpc.SubscribeStateResponse => {
  return decodeStreamResult<lnrpc.SubscribeStateResponse>({
    response: lnrpc.SubscribeStateResponse,
    base64Result: data,
  });
};

/**
 * @throws
 */
export const startLnd = async (torEnabled: boolean): Promise<string> => {
  await timeout(100);
  return "started";
};

/**
 * @throws
 */
export const checkApplicationSupportExists = async () => {
  return await LndMobileTools.checkApplicationSupportExists();
};

/**
 * @throws
 */
export const checkLndFolderExists = async () => {
  return await LndMobileTools.checkLndFolderExists();
};

/**
 * @throws
 */
export const createIOSApplicationSupportAndLndDirectories = async () => {
  return await LndMobileTools.createIOSApplicationSupportAndLndDirectories();
};

/**
 * @throws
 */
export const TEMP_moveLndToApplicationSupport = async () => {
  return await LndMobileTools.TEMP_moveLndToApplicationSupport();
};

/**
 * @throws
 */
export const excludeLndICloudBackup = async () => {
  return await LndMobileTools.excludeLndICloudBackup();
};

export const checkICloudEnabled = async (): Promise<boolean> => {
  return await LndMobileTools.checkICloudEnabled();
};

/**
 * @throws
 */
export const connectPeer = async (pubkey: string, host: string): Promise<lnrpc.ConnectPeerResponse> => {
  const response = lnrpc.ConnectPeerResponse.create({});
  return response;
};

/**
 * @throws
 */
export const getNodeInfo = async (pubKey: string): Promise<lnrpc.NodeInfo> => {
  const response = lnrpc.NodeInfo.create({
    channels: [],
    node: lnrpc.LightningNode.create({
      addresses: [],
      alias: "Node alias",
      color: "#ff0000",
      features: {},
      pubKey: "abcdef",
      lastUpdate: 0,
    }),
    numChannels: 0,
    totalCapacity: Long.fromValue(0),
  });
  return response;
};

/**
 * @throws
 */
let getInfoCount = 0;
export const getInfo = async (): Promise<lnrpc.GetInfoResponse> => {
  if (getInfoCount++ < 1) {
    const response = lnrpc.GetInfoResponse.create({
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
    return response;
  }
  const response = lnrpc.GetInfoResponse.create({
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
    syncedToChain: true,
    syncedToGraph: true,
    testnet: true,
    bestHeaderTimestamp: Long.fromNumber(1564940232),
    version: "0.7.1-beta commit=v0.7.1-beta-rc1-10-g3760f29f5e758b2865b756604333ca22cf23e90b",
    features: {},
  });
  return response;
};

/**
 *
 * @throws
 * @param paymentRequest BOLT11-encoded payment request
 * @params name TLV record for sender name
 *
 */
export const sendPaymentSync = async (paymentRequest: string, amount?: Long, tlvRecordName?: string | null): Promise<lnrpc.SendResponse> => {
  await timeout(600);

  const paymentHash = await generateSecureRandom(32);
  const paymentPreimage = await generateSecureRandom(32);

  const response = lnrpc.SendResponse.create({
    paymentHash,
    paymentPreimage,
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


export const sendPaymentV2Sync = async (paymentRequest: string, amount?: Long, tlvRecordName?: string | null): Promise<lnrpc.Payment> => {
  await timeout(600);

  const paymentHash = await generateSecureRandom(32);
  const paymentPreimage = await generateSecureRandom(32);

  const response = lnrpc.Payment.create({
    paymentHash: bytesToHexString(paymentHash),
    paymentPreimage: bytesToHexString(paymentPreimage),

    status: lnrpc.Payment.PaymentStatus.SUCCEEDED,
    fee: Long.fromValue(1),
    feeMsat: Long.fromValue(1000),
    htlcs: [{
      route: {
        hops: [{
          chanId: Long.fromValue(1),
          chanCapacity: Long.fromValue(10000),
          amtToForward: Long.fromValue(100),
          amtToForwardMsat: Long.fromValue(100000),
          fee: Long.fromValue(1),
          feeMsat: Long.fromValue(1000),
          expiry: 3600,
          pubKey: "abc",
        }],
      },
    }],
  });
  return response;
};

// TODO error handling
export const decodeSendPaymentV2Result = (data: string): lnrpc.Payment => {
  console.error("fake decodeSendPaymentV2Result not implemented");
  // return decodeStreamResult<lnrpc.Payment>({
  //   response: lnrpc.Payment,
  //   base64Result: data,
  // });
};


/**
 * @throws
 */
export const sendKeysendPaymentSync = async (destinationPubKey: Uint8Array, sat: Long, preImage: Uint8Array): Promise<lnrpc.SendResponse> => {
  console.error("fake sendKeysendPaymentSync not implemented");
  // const response = await sendCommand<lnrpc.ISendRequest, lnrpc.SendRequest, lnrpc.SendResponse>({
  //   request: lnrpc.SendRequest,
  //   response: lnrpc.SendResponse,
  //   method: "SendPaymentSync",
  //   options: {
  //     dest: destinationPubKey,
  //     amt: sat,
  //     paymentHash: sha("sha256").update(preImage).digest(),
  //     destCustomRecords: {
  //       // 5482373484 is the record for lnd
  //       // keysend payments as described in
  //       // https://github.com/lightningnetwork/lnd/releases/tag/v0.9.0-beta
  //       "5482373484": preImage,
  //     },
  //   },
  // });
  // return response;
};

/**
 * @throws
 */
export const addInvoice = async (amount: number, memo: string, expiry: number = 3600): Promise<lnrpc.AddInvoiceResponse> => {
  try {
    const paymentHash = await generateSecureRandom(32);
    const paymentPreimage = await generateSecureRandom(32);
    const unixTimestamp = Math.floor(Date.now() / 1000);
    // const encoded = payReq.encode({
    //   coinType: "testnet",
    //   satoshis: amount,
    //   timestamp: unixTimestamp,
    //   timeExpireDate: expiry,
    //   tags: [{
    //     tagName: "payment_hash",
    //     data: "0001020304050607080900010203040506070809000102030405060708090102",
    //   }, {
    //     tagName: "description",
    //     data: memo,
    //   }],
    // });

    // const privateKeyHex = "e126f68f7eafcc8b74f54d269fe206be715000f94dac067d1c04a8ca3b2db734";
    // const signed = payReq.sign(encoded, privateKeyHex);

    const response = lnrpc.AddInvoiceResponse.create({
      paymentRequest: "lnbc1p0nqccppp5p5kgsr0sfc787n6xzpwv63k05k05lzzck90peefr37nxvktp06rqdq0fpsk6ur4wvazqgqcqzpgxqrrssrzjqtdqwyatrvfwavqlyy55ffp4qalnnudhvlh9cf9srnd5kzunw7mxkzwxg5qq0ksqqqqqqyugqqqqhwqpyqsp53sukk23w33nyvg5efjrl5k8dkjlcqrwjn25jeeca80t599fg7n9s9qy9qsq70vcpv4zpgp465w0n373yxqrcla8n07teznwwu4srv4gvhrmhaeqh4zuerl370ms7dxu5wulqcafaf2u6egeay0vuma94yrwud2n6esq7wq4t9",
      addIndex: Long.fromNumber(0),
      rHash: paymentHash,
    });

    setTimeout(() => {
      // const description = signed!.tags.find((tag) => tag.tagName === "d");
      // const cltvExpiry = signed!.tags.find((tag) => tag.tagName === "min_final_cltv_expiry");
      const invoice = lnrpc.Invoice.create({
        paymentRequest: "lnbc1p0nqccppp5p5kgsr0sfc787n6xzpwv63k05k05lzzck90peefr37nxvktp06rqdq0fpsk6ur4wvazqgqcqzpgxqrrssrzjqtdqwyatrvfwavqlyy55ffp4qalnnudhvlh9cf9srnd5kzunw7mxkzwxg5qq0ksqqqqqqyugqqqqhwqpyqsp53sukk23w33nyvg5efjrl5k8dkjlcqrwjn25jeeca80t599fg7n9s9qy9qsq70vcpv4zpgp465w0n373yxqrcla8n07teznwwu4srv4gvhrmhaeqh4zuerl370ms7dxu5wulqcafaf2u6egeay0vuma94yrwud2n6esq7wq4t9",
        private: false,
        memo,
        addIndex: Long.fromNumber(0), // TODO
        amtPaid: Long.fromNumber(100),
        rHash: paymentHash,
        value: Long.fromNumber(amount),
        amtPaidMsat: Long.fromNumber(amount).mul(1000),
        amtPaidSat: Long.fromNumber(amount),
        cltvExpiry: Long.fromNumber(3600),
        creationDate: Long.fromNumber(unixTimestamp),
        expiry: Long.fromNumber(expiry),
        rPreimage: paymentPreimage,
        settled: false,
        state: lnrpc.Invoice.InvoiceState.OPEN,
      });
      DeviceEventEmitter.emit("SubscribeInvoices", {
        data: base64.fromByteArray(lnrpc.Invoice.encode(invoice).finish()),
      });
  }, 600);

    return response;
  } catch (e) {
    console.log(e);
    throw e;
  }
};
export const addInvoiceBlixtLsp = ({amount, memo, expiry = 600, servicePubkey, chanId, cltvExpiryDelta, feeBaseMsat, feeProportionalMillionths, preimage}: IAddInvoiceBlixtLspArgs) => {
  return addInvoice(amount, memo, expiry);
}

export const cancelInvoice = async (paymentHash: string): Promise<invoicesrpc.CancelInvoiceResp> => {
  const response = invoicesrpc.CancelInvoiceResp.create({});
  return response;
}

/**
 * @throws
 */
export const lookupInvoice = async (rHash: string): Promise<lnrpc.Invoice> => {
  const unixTimestamp = Math.floor(Date.now() / 1000);

  const invoice = lnrpc.Invoice.create({
    creationDate: Long.fromValue(unixTimestamp),
    expiry: Long.fromValue(3600),
    paymentRequest: "lnbc1p0nqccppp5p5kgsr0sfc787n6xzpwv63k05k05lzzck90peefr37nxvktp06rqdq0fpsk6ur4wvazqgqcqzpgxqrrssrzjqtdqwyatrvfwavqlyy55ffp4qalnnudhvlh9cf9srnd5kzunw7mxkzwxg5qq0ksqqqqqqyugqqqqhwqpyqsp53sukk23w33nyvg5efjrl5k8dkjlcqrwjn25jeeca80t599fg7n9s9qy9qsq70vcpv4zpgp465w0n373yxqrcla8n07teznwwu4srv4gvhrmhaeqh4zuerl370ms7dxu5wulqcafaf2u6egeay0vuma94yrwud2n6esq7wq4t9",
    private: false,
    // memo,
    addIndex: Long.fromNumber(0), // TODO
    amtPaid: Long.fromNumber(100),
    rHash: new Uint8Array([1, 2, 3]), // TODO
    // value: Long.fromNumber(amount),
    // amtPaidMsat: Long.fromNumber(amount).mul(1000),
    // amtPaidSat: Long.fromNumber(amount),
    cltvExpiry: Long.fromNumber(3600),
    // creationDate: Long.fromNumber(unixTimestamp),
    // expiry: Long.fromNumber(expiry),
    rPreimage: new Uint8Array([1, 2, 3, 4]), // TODO
    settled: false,
    state: lnrpc.Invoice.InvoiceState.OPEN,
  });
  return invoice;
  // lnrpc.Invoice.create({})

  // const response = await sendCommand<lnrpc.IPaymentHash, lnrpc.PaymentHash, lnrpc.Invoice>({
  //   request: lnrpc.PaymentHash,
  //   response: lnrpc.Invoice,
  //   method: "LookupInvoice",
  //   options: {
  //     rHashStr: rHash,
  //   },
  // });
  // return response;
};

/**
 * @throws
 */
export const listPeers = async (): Promise<lnrpc.ListPeersResponse> => {
  console.error("fake listPeers not implemented");
  const listPeers = lnrpc.ListPeersResponse.create({
    peers: [{
      address: "123.456.78.90",
      bytesRecv: Long.fromValue(10),
      bytesSent: Long.fromValue(10),
      errors: [],
      features: {},
      inbound: false,
      pingTime: Long.fromValue(50),
      pubKey: "abcdef123456",
      satRecv: Long.fromValue(100),
      satSent: Long.fromValue(100),
      syncType: lnrpc.Peer.SyncType.PASSIVE_SYNC,
    }]
  });
  return listPeers;
};


/**
 * @throws
 */
export const queryRoutes = async (pubKey: string): Promise<lnrpc.QueryRoutesResponse> => {
  console.error("fake queryRoutes not implemented");
  // const response = await sendCommand<lnrpc.IQueryRoutesRequest, lnrpc.IQueryRoutesRequest, lnrpc.QueryRoutesResponse>({
  //   request: lnrpc.QueryRoutesRequest,
  //   response: lnrpc.QueryRoutesResponse,
  //   method: "QueryRoutes",
  //   options: {
  //     pubKey,
  //   },
  // });
  // return response;
};

/**
 * @throws
 */
export const decodePayReq = async (bolt11: string): Promise<lnrpc.PayReq> => {
  const unixTimestamp = Math.floor(Date.now() / 1000);
  const paymentHash = await generateSecureRandom(32);

  const response = lnrpc.PayReq.create({
    paymentHash: bytesToHexString(paymentHash),
    timestamp: Long.fromValue(unixTimestamp),
    cltvExpiry: Long.fromValue(100),
    description: "Description",
    destination: "abcdef123",
    expiry: Long.fromValue(1000),
    features: {},
    numSatoshis: Long.fromValue(1000),
  });
  return response;
};

export type IReadLndLogResponse = string[];
/**
 * @throws
 * TODO remove
 */
export const readLndLog = async (): Promise<IReadLndLogResponse> => {
  return [""];
};

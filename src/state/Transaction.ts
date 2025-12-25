import { Thunk, thunk, Action, action, Computed, computed } from "easy-peasy";
import {
  ITransaction,
  getTransactions,
  createTransaction,
  updateTransaction,
} from "../storage/database/transaction";

import { IStoreModel } from "./index";
import { IStoreInjections } from "./store";
import { bytesToHexString, hexToUint8Array } from "../utils";

import { listInvoices, lookupInvoice, routerTrackPaymentV2 } from "react-native-turbo-lnd";
import {
  Invoice,
  Invoice_InvoiceState,
  Payment_PaymentStatus,
} from "react-native-turbo-lnd/protos/lightning_pb";

import logger from "./../utils/log";
const log = logger("Transaction");

export interface ISyncInvoicesFromLndResult {
  syncedInvoices: number;
  updatedInvoices: number;
  totalLndInvoices: number;
}

export interface ITransactionModel {
  addTransaction: Action<ITransactionModel, ITransaction>;
  updateTransaction: Action<ITransactionModel, { transaction: ITransaction }>;

  syncTransaction: Thunk<ITransactionModel, ITransaction, any, IStoreModel>;

  getTransactions: Thunk<ITransactionModel, undefined, any, IStoreModel>;
  checkOpenTransactions: Thunk<ITransactionModel, undefined, IStoreInjections, IStoreModel>;
  syncInvoicesFromLnd: Thunk<
    ITransactionModel,
    undefined,
    IStoreInjections,
    IStoreModel,
    Promise<ISyncInvoicesFromLndResult>
  >;
  setTransactions: Action<ITransactionModel, ITransaction[]>;

  transactions: ITransaction[];
  getTransactionByRHash: Computed<ITransactionModel, (rHash: string) => ITransaction | undefined>;
  getTransactionByPreimage: Computed<
    ITransactionModel,
    (preimage: Uint8Array) => ITransaction | undefined
  >;
  getTransactionByPaymentRequest: Computed<
    ITransactionModel,
    (paymentRequest: string) => ITransaction | undefined
  >;
}

export const transaction: ITransactionModel = {
  /**
   * Synchronizes incoming transactions coming
   * from gGPRC `SubscribeInvoices` (Java backend), from listener in `Receive` store
   * Checks if we have it in our transaction array, otherwise create a new transaction in the db
   */
  syncTransaction: thunk(async (actions, tx, { getState, getStoreState }) => {
    const db = getStoreState().db;
    if (!db) {
      throw new Error("syncTransaction(): db not ready");
    }

    const transactions = getState().transactions;
    let foundTransaction = false;

    for (const txIt of transactions) {
      if (txIt.paymentRequest === tx.paymentRequest) {
        await updateTransaction(db, { ...txIt, ...tx });
        actions.updateTransaction({ transaction: { ...txIt, ...tx } });
        foundTransaction = true;
      }
    }

    if (!foundTransaction) {
      const id = await createTransaction(db, tx);
      actions.addTransaction({ ...tx, id });
    }
  }),

  /**
   * Updates a transaction in our transaction array
   */
  updateTransaction: action((state, payload) => {
    const { transaction: tx } = payload;

    for (let i = 0; i < state.transactions.length; i++) {
      if (state.transactions[i].rHash === tx.rHash) {
        state.transactions[i] = tx;
      }
    }
  }),

  /**
   * Add a transaction
   */
  addTransaction: action((state, tx) => {
    state.transactions.unshift(tx);
  }),

  /**
   * Get transactions from the db
   * and add it to our transaction array
   */
  getTransactions: thunk(async (actions, _, { getStoreState }) => {
    log.d("getTransactions()");
    const db = getStoreState().db;
    if (!db) {
      throw new Error("getTransactions(): db not ready");
    }
    const hideExpiredInvoices = getStoreState().settings.hideExpiredInvoices;

    const transactions = await getTransactions(db, !hideExpiredInvoices);
    actions.setTransactions(transactions);
    log.d("getTransactions() done");
  }),

  /**
   * On app start, check if any invoices have
   * been settled while we were away.
   */
  checkOpenTransactions: thunk(async (actions, _, { getState, getStoreState }) => {
    const db = getStoreState().db;
    if (!db) {
      throw new Error("checkOpenTransactions(): db not ready");
    }

    for (const tx of getState().transactions) {
      if (tx.status === "OPEN") {
        log.i("trackpayment tx", [tx.rHash]);
        if (tx.valueMsat < 0n) {
          const unsubscribeTrackPayment = routerTrackPaymentV2(
            {
              paymentHash: hexToUint8Array(tx.rHash),
              noInflightUpdates: true,
            },
            async (trackPaymentResult) => {
              log.i("trackpayment status", [
                trackPaymentResult.status,
                trackPaymentResult.paymentHash,
              ]);
              if (trackPaymentResult.status === Payment_PaymentStatus.SUCCEEDED) {
                log.i("trackpayment updating tx [settled]");
                const updated: ITransaction = {
                  ...tx,
                  status: "SETTLED",
                  preimage: hexToUint8Array(trackPaymentResult.paymentPreimage),
                  hops:
                    trackPaymentResult.htlcs[0].route?.hops?.map((hop) => ({
                      chanId: BigInt(hop.chanId),
                      chanCapacity: hop.chanCapacity,
                      amtToForward: hop.amtToForwardMsat / 1000n,
                      amtToForwardMsat: hop.amtToForwardMsat,
                      fee: hop.feeMsat / 1000n,
                      feeMsat: hop.feeMsat,
                      expiry: hop.expiry,
                      pubKey: hop.pubKey,
                    })) ?? [],
                };
                // tslint:disable-next-line
                updateTransaction(db, updated).then(() =>
                  actions.updateTransaction({ transaction: updated }),
                );
              } else if (trackPaymentResult.status === Payment_PaymentStatus.UNKNOWN) {
                log.i("trackpayment updating tx [unknown]");
                const updated: ITransaction = {
                  ...tx,
                  status: "UNKNOWN",
                };
                // tslint:disable-next-line
                updateTransaction(db, updated).then(() =>
                  actions.updateTransaction({ transaction: updated }),
                );
              } else if (trackPaymentResult.status === Payment_PaymentStatus.FAILED) {
                log.i("trackpayment updating tx [failed]");
                const updated: ITransaction = {
                  ...tx,
                  status: "CANCELED",
                };
                // tslint:disable-next-line
                updateTransaction(db, updated).then(() =>
                  actions.updateTransaction({ transaction: updated }),
                );
              }

              // TURBOLND(hsjoberg): commenting this one out for now as it's not clear when we should unsubscribe
              // unsubscribeTrackPayment();
            },
            (err) => {
              log.w("An error occourred inside routerTrackPaymentV2", [err]);
              // TURBOLND(hsjoberg): commenting this one out for now as it's not clear when we should unsubscribe
              // unsubscribeTrackPayment();
            },
          );
        } else {
          const check = await lookupInvoice({ rHash: hexToUint8Array(tx.rHash) });
          if (Date.now() / 1000 > check.creationDate + check.expiry) {
            const updated: ITransaction = {
              ...tx,
              status: "EXPIRED",
            };
            // tslint:disable-next-line
            updateTransaction(db, updated).then(() => {
              actions.updateTransaction({ transaction: updated });
            });
          } else if (check.state === Invoice_InvoiceState.SETTLED) {
            const updated: ITransaction = {
              ...tx,
              status: "SETTLED",
              value: check.amtPaidSat,
              valueMsat: check.amtPaidMsat,
              // TODO add valueUSD, valueFiat and valueFiatCurrency?
            };
            // tslint:disable-next-line
            updateTransaction(db, updated).then(() =>
              actions.updateTransaction({ transaction: updated }),
            );
          } else if (check.state === Invoice_InvoiceState.CANCELED) {
            const updated: ITransaction = {
              ...tx,
              status: "CANCELED",
            };
            // tslint:disable-next-line
            updateTransaction(db, updated).then(() => {
              actions.updateTransaction({ transaction: updated });
            });
          }
        }
      }
    }

    return true;
  }),

  /**
   * Syncs invoices from LND's internal database to our SQLite database.
   * This helps recover invoices that may have been missed or lost.
   */
  syncInvoicesFromLnd: thunk(async (actions, _, { getState, getStoreState }) => {
    const db = getStoreState().db;
    if (!db) {
      throw new Error("syncInvoicesFromLnd(): db not ready");
    }

    log.i("Starting invoice sync from LND");

    let syncedInvoices = 0;
    let updatedInvoices = 0;
    let totalLndInvoices = 0;
    let indexOffset = 0n;
    const numMaxInvoices = 100n;
    let hasMore = true;

    while (hasMore) {
      const response = await listInvoices({
        indexOffset,
        numMaxInvoices,
        reversed: false,
      });

      const invoices = response.invoices;
      totalLndInvoices += invoices.length;

      for (const invoice of invoices) {
        const rHash = bytesToHexString(invoice.rHash);
        const existingTx = getState().transactions.find((tx) => tx.rHash === rHash);

        if (!existingTx) {
          // Invoice not in our database, create it
          const newTransaction = convertLndInvoiceToTransaction(invoice);
          const id = await createTransaction(db, newTransaction);
          actions.addTransaction({ ...newTransaction, id });
          syncedInvoices++;
          log.d("Synced missing invoice", [rHash]);
        } else {
          // Check if status needs updating
          const lndStatus = decodeInvoiceState(invoice.state);
          if (existingTx.status !== lndStatus && lndStatus !== "UNKNOWN") {
            const updated: ITransaction = {
              ...existingTx,
              status: lndStatus,
              preimage: invoice.rPreimage,
              value: invoice.value,
              valueMsat: invoice.valueMsat,
              amtPaidSat: invoice.amtPaidSat,
              amtPaidMsat: invoice.amtPaidMsat,
            };
            await updateTransaction(db, updated);
            actions.updateTransaction({ transaction: updated });
            updatedInvoices++;
            log.d("Updated invoice status", [rHash, existingTx.status, "->", lndStatus]);
          }
        }
      }

      // Check if there are more invoices to fetch
      if (invoices.length < Number(numMaxInvoices)) {
        hasMore = false;
      } else {
        indexOffset = response.lastIndexOffset;
      }
    }

    log.i("Invoice sync complete", [
      `synced: ${syncedInvoices}`,
      `updated: ${updatedInvoices}`,
      `total from LND: ${totalLndInvoices}`,
    ]);

    return {
      syncedInvoices,
      updatedInvoices,
      totalLndInvoices,
    };
  }),

  /**
   * Set transactions to our transaction array
   */
  setTransactions: action((state, transactions) => {
    state.transactions = transactions;
  }),

  transactions: [],
  getTransactionByRHash: computed((state) => {
    return (rHash: string) => {
      return state.transactions.find((tx) => rHash === tx.rHash);
    };
  }),

  getTransactionByPreimage: computed((state) => {
    return (preimage: Uint8Array) => {
      return state.transactions.find(
        (tx) => bytesToHexString(preimage) === bytesToHexString(tx.preimage),
      );
    };
  }),

  getTransactionByPaymentRequest: computed((state) => {
    return (paymentRequest: string) => {
      return state.transactions.find((tx) => {
        return paymentRequest === tx.paymentRequest;
      });
    };
  }),
};

/**
 * Converts an LND Invoice to our ITransaction format
 */
function convertLndInvoiceToTransaction(invoice: Invoice): ITransaction {
  const rHash = bytesToHexString(invoice.rHash);

  return {
    description: invoice.memo || (invoice.isKeysend ? "Keysend payment" : ""),
    value: invoice.value,
    valueMsat: invoice.valueMsat,
    amtPaidSat: invoice.amtPaidSat,
    amtPaidMsat: invoice.amtPaidMsat,
    fee: null,
    feeMsat: null,
    date: invoice.creationDate,
    duration: 0,
    expire: invoice.creationDate + invoice.expiry,
    remotePubkey: "", // Not available from listInvoices
    status: decodeInvoiceState(invoice.state),
    paymentRequest: invoice.paymentRequest,
    rHash,
    nodeAliasCached: null,
    valueUSD: null,
    valueFiat: null,
    valueFiatCurrency: null,
    tlvRecordName: null,
    lightningAddress: null,
    lud16IdentifierMimeType: null,
    payer: null,
    website: null,
    identifiedService: null,
    type: "NORMAL",
    locationLat: null,
    locationLong: null,
    preimage: invoice.rPreimage,
    lnurlPayResponse: null,
    lud18PayerData: null,
    hops: [],
  };
}

/**
 * Decodes LND's Invoice_InvoiceState to our status string
 */
function decodeInvoiceState(
  invoiceState: Invoice_InvoiceState,
): "ACCEPTED" | "CANCELED" | "OPEN" | "SETTLED" | "UNKNOWN" {
  switch (invoiceState) {
    case Invoice_InvoiceState.ACCEPTED:
      return "ACCEPTED";
    case Invoice_InvoiceState.CANCELED:
      return "CANCELED";
    case Invoice_InvoiceState.OPEN:
      return "OPEN";
    case Invoice_InvoiceState.SETTLED:
      return "SETTLED";
    default:
      return "UNKNOWN";
  }
}

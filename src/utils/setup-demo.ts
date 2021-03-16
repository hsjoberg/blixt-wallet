import { Dispatch } from "easy-peasy";
import Long from "long";
import { IStoreModel } from "../state";
import { setItem, StorageItem } from "../storage/app";
import { createTransaction, ITransaction } from "../storage/database/transaction";
import { ILightningServices } from "./lightning-services";

export default async function SetupBlixtDemo(
  db: any,
  dispatch: Dispatch<IStoreModel>,
  createDbTransactions: boolean = false,
) {
  interface IDemoInvoice {
    description: string;
    value: number;
    type: "PAY" | "RECEIVE";
    payer?: string;
    website?: string;
    lightningService: keyof ILightningServices | null;
  }
  const createDemoTransactions = async (invoices: IDemoInvoice[]) => {
    for (const invoice of invoices) {
      const transaction: ITransaction = {
        date: Long.fromNumber(1546300800 + Math.floor(Math.random() * 1000000)),
        description: invoice.description,
        remotePubkey: "02ad5e3811fb075e69fe2f038fcc1ece7dfb47150a3b20698f3e9845ef6b6283b6",
        expire: Long.fromNumber(1577836800 + Math.floor(Math.random() * 1000)),
        status: "SETTLED",
        value: Long.fromNumber((invoice.type == "PAY" ? -1 : 1) * invoice.value),
        valueMsat: Long.fromNumber((invoice.type == "PAY" ? -1 : 1) * invoice.value * 1000),
        amtPaidSat: Long.fromNumber((invoice.type == "PAY" ? -1 : 1) * 0),
        amtPaidMsat: Long.fromNumber((invoice.type == "PAY" ? -1 : 1) * 0),
        valueUSD: (invoice.type == "PAY" ? -1 : 1) * 100,
        valueFiat: (invoice.type == "PAY" ? -1 : 1) * 100,
        valueFiatCurrency: "SEK",
        fee: Long.fromNumber(Math.floor(Math.random() * 5)),
        feeMsat: Long.fromNumber(Math.floor(Math.random() * 5) * 1000),
        paymentRequest: "abcdef123456",
        rHash: Math.floor(Math.random() * 10000000).toString(),
        nodeAliasCached: null,
        payer: invoice.payer,
        type: "NORMAL",
        tlvRecordName: null,
        locationLat: 40.730610,
        locationLong: -73.935242,
        website: invoice.website ?? null,
        hops: [],
        preimage: new Uint8Array([0,0]),
        lnurlPayResponse: null,
        identifiedService: invoice.lightningService,
      };
      if (createDbTransactions) {
        await createTransaction(db, transaction);
      } else {
        dispatch.transaction.addTransaction(transaction);
      }
    }
  }

  dispatch.transaction.setTransactions([]);

  await createDemoTransactions([{
    value: 150,
    description: "Read: Lightning Network Trivia",
    type: "PAY",
    website: "yalls.org",
    lightningService: "yalls",
  }, {
    value: 100,
    description: "lightning.gifts redeem 369db072d4252ca056a2a92150b87c6", //7f1f8b0d9a9001d0a",
    type: "RECEIVE",
    website: "api.lightning.gifts",
    lightningService: "lightninggifts",
  }, {
    value: 62,
    description: "Payment for 62 pixels at satoshis.place",
    type: "PAY",
    website: "satoshis.place",
    lightningService: "satoshisplace",
  }, {
    value: 100,
    description: "Withdrawal",
    type: "RECEIVE",
    website: "thndr.games",
    lightningService: "thndrgames",
  }, {
    value: 100,
    description: "etleneum exchange [c7k1dl3gdg3][row4f18ktv]",
    type: "RECEIVE",
    website: "etleneum.com",
    lightningService: "etleneum",
  }, {
    value: 1000,
    description: "LuckyThunder.com pin:2164",
    type: "PAY",
    website: "www.luckythunder.com",
    lightningService: "luckythunder",
  }, {
    value: 700,
    description: "lnsms.world: One text message",
    type: "PAY",
    website: "lnsms.world",
    lightningService: "lnsms",
  }, {
    value: 17600,
    description: "Bitrefill 12507155-a8ff-82a1-1cd4-f79a1346d5c2",
    type: "PAY",
    lightningService: "bitrefill",
  }, {
    value: 1000,
    description: "Feed Chickens @ pollofeed.com",
    type: "PAY",
    website: "pollofeed.com",
    lightningService: "pollofeed",
  },  {
    value: 1000,
    description: "1000 sats bet on 2",
    type: "PAY",
    website: "lightningspin.com",
    lightningService: "lightningspin",
  }]);

  if (createDbTransactions) {
    await dispatch.transaction.getTransactions();
  }

  await setItem(StorageItem.onboardingState, "DONE");
  dispatch.setOnboardingState("DONE");
  dispatch.channel.setBalance(Long.fromNumber(439758));
};

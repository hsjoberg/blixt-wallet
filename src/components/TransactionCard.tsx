import React from "react";
import { StyleSheet, View, Image, Platform } from "react-native";
import { Body, Card, CardItem, Text, Right } from "native-base";

import { fromUnixTime } from "date-fns";
import { ITransaction } from "../storage/database/transaction";
import { blixtTheme } from ".././native-base-theme/variables/commonColor";
import { capitalize, formatISO } from "../utils";
import { extractDescription } from "../utils/NameDesc";
import {
  IBitcoinUnits,
  formatBitcoin,
  convertBitcoinToFiat,
  getUnitNice,
} from "../utils/bitcoin-units";
import { useStoreState } from "../state/store";
import { getLightningService } from "../utils/lightning-services";
import { fontFactor, fontFactorSubtle, zoomed } from "../utils/scale";
import BigNumber from "bignumber.js";

interface IProps {
  onPress: (id: string) => void;
  transaction: ITransaction;
  unit: keyof IBitcoinUnits;
}
export default function TransactionCard({ onPress, transaction, unit }: IProps) {
  const { date, value, amtPaidSat, status, tlvRecordName } = transaction;
  const positive = value >= 0;
  let { name, description } = extractDescription(transaction.description);

  const fiatUnit = useStoreState((store) => store.settings.fiatUnit);
  const currentRate = useStoreState((store) => store.fiat.currentRate);
  const preferFiat = useStoreState((store) => store.settings.preferFiat);
  const hideAmountsEnabled = useStoreState((store) => store.settings.hideAmountsEnabled);
  const bitcoinUnit = useStoreState((store) => store.settings.bitcoinUnit);

  let transactionValue: bigint;
  if (amtPaidSat > 0) {
    transactionValue = amtPaidSat;
  } else {
    transactionValue = value;
  }

  // const start = performance.now();
  const lightningService = getLightningService(transaction);
  // console.log("Time: " + (performance.now() - start));

  let recipientOrSender;
  if (transaction.note) {
    description = transaction.note;
  } else {
    if (transaction.lud18PayerData) {
      if (transaction.lud18PayerData.identifier) {
        recipientOrSender = transaction.lud18PayerData.identifier;
      } else if (transaction.lud18PayerData.email) {
        recipientOrSender = transaction.lud18PayerData.email;
      } else if (transaction.lud18PayerData.name) {
        recipientOrSender = transaction.lud18PayerData.name;
      }
    } else if (transaction.lightningAddress) {
      recipientOrSender = transaction.lightningAddress;
    } else if (lightningService) {
      recipientOrSender = lightningService.title;
    } else if (transaction.website) {
      recipientOrSender = transaction.website;
    } else if (transaction.value < 0 && name) {
      recipientOrSender = name;
    } else if (transaction.value >= 0 && tlvRecordName) {
      recipientOrSender = tlvRecordName;
    } else if (transaction.value >= 0 && transaction.payer) {
      recipientOrSender = transaction.payer;
    }
  }

  let statusLabel: string | undefined = undefined;
  if (status !== "SETTLED") {
    statusLabel = capitalize(status);
    // Special case for pending payments ("pre-transactions")
    if (status === "OPEN" && transaction.valueMsat < 0) {
      statusLabel = "Pending";
    }
  }

  const getDescription = () => {
    if (!description || !description.length) {
      return "No description";
    }

    if (description.length > 120) {
      return `${description.substring(0, 100)}...`;
    }

    return description;
  };

  return (
    <Card>
      <CardItem activeOpacity={1} button={true} onPress={() => onPress(transaction.rHash)}>
        <Body style={{ flexDirection: "row" }}>
          {lightningService && (
            <View style={transactionStyle.avatarContainer}>
              <Image
                source={{ uri: lightningService.image }}
                style={transactionStyle.avatarImage}
                width={43}
                height={43}
              />
            </View>
          )}
          <View style={{ flex: 1 }}>
            <View style={transactionStyle.transactionTop}>
              <Text style={transactionStyle.transactionTopDate}>
                {formatISO(fromUnixTime(Number(date)), zoomed)}
              </Text>
              <Right>
                <Text
                  style={
                    positive
                      ? transactionStyle.transactionTopValuePositive
                      : transactionStyle.transactionTopValueNegative
                  }
                >
                  {transactionValue !== 0n && (
                    <>
                      {positive ? "+" : ""}

                      {!hideAmountsEnabled && (
                        <>
                          {!preferFiat && formatBitcoin(transactionValue, unit)}
                          {preferFiat &&
                            convertBitcoinToFiat(transactionValue, currentRate, fiatUnit)}
                        </>
                      )}
                      {hideAmountsEnabled && (
                        <>
                          {!preferFiat && (
                            <>
                              {!positive ? "-" : ""}●●● {getUnitNice(new BigNumber(2), bitcoinUnit)}
                            </>
                          )}
                          {preferFiat && (
                            <>
                              {!positive ? "-" : ""}●●● {fiatUnit}
                            </>
                          )}
                        </>
                      )}
                    </>
                  )}
                </Text>
              </Right>
            </View>
            <View
              style={{
                flex: 1,
                display: "flex",
                flexDirection: "row",
                justifyContent: "space-between",
                width: "100%",
              }}
            >
              <Text note={true} style={transactionStyle.transactionText}>
                {recipientOrSender && (
                  <Text style={transactionStyle.recipientOrSender} note={true}>
                    {recipientOrSender}:{" "}
                  </Text>
                )}
                {getDescription()}
              </Text>
              <Text note={true} style={transactionStyle.status}>
                {statusLabel}
              </Text>
            </View>
          </View>
        </Body>
      </CardItem>
    </Card>
  );
}

const transactionStyle = StyleSheet.create({
  transactionTop: {
    flex: 1,
    flexDirection: "row",
    marginBottom: 8,
  },
  transactionTopDate: {
    paddingRight: 4,
    fontSize: (zoomed ? 12 : 15) * fontFactor,
  },
  transactionTopValuePositive: {
    color: blixtTheme.green,
    fontSize: (zoomed ? 12 : 15) * fontFactor,
    textAlign: "right",
  },
  transactionTopValueNegative: {
    color: blixtTheme.red,
    fontSize: (zoomed ? 12 : 15) * fontFactor,
    textAlign: "right",
  },
  avatarContainer: {
    width: 50,
    alignSelf: "center",
    marginTop: 2,
    marginRight: 7,
    marginLeft: -2,
  },
  avatarImage: {
    width: 43,
    height: 43,
    borderRadius: 22,
  },
  transactionText: {
    fontSize: 15 * fontFactorSubtle,
    flex: 1,
    marginRight: 0,
    ...Platform.select({
      web: {
        wordBreak: "break-all",
      },
    }),
  },
  recipientOrSender: {
    fontSize: 15 * fontFactorSubtle,
    fontWeight: "bold",
  },
  status: {
    fontSize: 15 * fontFactorSubtle,
    marginLeft: 8,
    marginRight: 0,
  },
});

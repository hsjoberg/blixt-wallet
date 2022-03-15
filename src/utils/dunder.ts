import { State } from "easy-peasy";
import Long from "long";
import { IStoreModel } from "../state";
import { IFiatRates } from "../state/Fiat";
import { Alert } from "./alert";
import { convertBitcoinToFiat, formatBitcoin, IBitcoinUnits } from "./bitcoin-units";

export function dunderPrompt(
  approxFeeSat: number,
  bitcoinUnit: keyof IBitcoinUnits,
  currentFiatRate: number,
  fiatUnit: keyof IFiatRates,
) {
  return new Promise((resolve, reject) => {
    const approxFeeFormatted = formatBitcoin(Long.fromValue(approxFeeSat), bitcoinUnit);
    const approxFeeFiat = convertBitcoinToFiat(approxFeeSat, currentFiatRate, fiatUnit);
    const message =
`In order to accept a payment for this invoice, a channel on the Lightning Network has to be opened.

This requires a one-time fee of approximately ${approxFeeFormatted} (${approxFeeFiat}).`;
    Alert.alert(
      "Channel opening",
      message,
      [{
        text: "Cancel",
        style: "cancel",
        onPress: () => resolve(false)
      }, {
        text: "Proceed",
        style: "default",
        onPress: async () => resolve(true)
      }]
    );
  })
}

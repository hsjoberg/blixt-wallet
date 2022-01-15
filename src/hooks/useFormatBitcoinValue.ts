import { formatBitcoin } from "../utils/bitcoin-units";
import Long from "long";

import { useStoreState } from "../state/store";

export default function useFormatBitcoinValue() {
  const bitcoinUnit = useStoreState((store) => store.settings.bitcoinUnit);

  return function(value: Long) {
    return formatBitcoin(value, bitcoinUnit, false);
  }
}

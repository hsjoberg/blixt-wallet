import { formatBitcoin } from "../utils/bitcoin-units";

import { useStoreState } from "../state/store";

export default function useFormatBitcoinValue() {
  const bitcoinUnit = useStoreState((store) => store.settings.bitcoinUnit);

  return function (value: BigInt) {
    return formatBitcoin(value, bitcoinUnit);
  };
}

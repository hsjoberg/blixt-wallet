import { OnchainExplorer } from "../state/Settings";

export function constructOnchainExplorerUrl(onchainExplorer: string, txId: string) {
  if (onchainExplorer in OnchainExplorer) {
    return OnchainExplorer[onchainExplorer as keyof typeof OnchainExplorer] + txId
  } else {
    // Custom explorer is used, `onchainExplorer` is the actual URL
    if (onchainExplorer[onchainExplorer.length - 1] !== "/") {
      onchainExplorer += "/";
    }
    return onchainExplorer + txId;
  }
}

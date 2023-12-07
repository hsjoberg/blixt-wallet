import { Chain } from "./build";

export function chainSelect<T>(chains: { mainnet: T; testnet?: T; regtest?: T; signet?: T }) {
  if (Chain === "mainnet") {
    return chains.mainnet;
  } else if (Chain === "testnet") {
    return chains.testnet ?? chains.mainnet;
  } else if (Chain === "signet") {
    return chains.signet;
  } else {
    // regtest
    return chains.regtest ?? chains.mainnet;
  }
}
